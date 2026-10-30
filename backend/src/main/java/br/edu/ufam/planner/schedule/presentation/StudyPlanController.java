package br.edu.ufam.planner.schedule.presentation;

import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import br.edu.ufam.planner.profile.domain.StudentProfileRepository;
import br.edu.ufam.planner.progress.application.ProgressException;
import br.edu.ufam.planner.integration.ufam.application.UfamPublicGradeService;
import br.edu.ufam.planner.integration.ufam.application.UfamUndergraduateDirectory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/study")
public class StudyPlanController {

    private final JdbcTemplate jdbc;
    private final StudentProfileRepository profiles;
    private final UfamPublicGradeService publicGrades;
    private final UfamUndergraduateDirectory directory;

    public StudyPlanController(JdbcTemplate jdbc, StudentProfileRepository profiles, UfamPublicGradeService publicGrades,
            UfamUndergraduateDirectory directory) {
        this.jdbc = jdbc;
        this.profiles = profiles;
        this.publicGrades = publicGrades;
        this.directory = directory;
    }

    public record CatalogDiscipline(UUID id, String code, String name, int workloadHours, String department,
            String gradeCourses, int gradeCourseCount) {}
    public record CatalogCoverageLevel(int levelId, String label, long courses, long indexedCourses) {}
    public record CatalogCoverage(long courses, long indexedCourses, long disciplines,
            List<CatalogCoverageLevel> levels) {}
    public record Meeting(UUID id, int weekday, int startHour, int endHour) {}
    public record Absence(UUID id, LocalDate missedOn, int missedHours, String note) {}
    public record CourseContext(String code, String name, String unitName, String unitAbbreviation,
            String officialUrl, String sourceUrl, String relation) {}
    public record Subject(UUID id, UUID disciplineId, String code, String name, int workloadHours,
            String offeringCourse, String sectionLabel, String academicTerm, String source, String category, String status,
            boolean countAsElective, boolean catalogMatched, boolean inCurriculum, CourseContext courseContext,
            List<Meeting> meetings, List<Absence> absences) {}
    public record MeetingInput(int weekday, int startHour) {}
    public record SubjectInput(UUID disciplineId, String code, String name, int workloadHours,
            String offeringCourse, String sectionLabel, String academicTerm, String category, String status,
            boolean countAsElective, List<MeetingInput> meetings) {}
    public record AbsenceInput(LocalDate missedOn, int missedHours, String note) {}

    @GetMapping("/catalog/disciplines")
    public List<CatalogDiscipline> search(@RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int levelId) {
        if (!Set.of(0, 3, 13, 14, 15, 16, 17, 18, 20, 22).contains(levelId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origem acadêmica inválida.");
        String term = query.trim();
        if (term.length() < 2) return List.of();
        return jdbc.query("""
                WITH origin AS (SELECT ?::integer AS level_id),
                associated_courses AS (
                    SELECT link.discipline_id, c.id AS course_id, c.code, c.name, c.ufam_level_id
                    FROM public_grade_course_discipline link JOIN course c ON c.id = link.course_id
                    WHERE c.active = TRUE
                    UNION
                    SELECT component.discipline_id, c.id AS course_id, c.code, c.name, c.ufam_level_id
                    FROM curriculum_component component
                    JOIN curriculum curriculum ON curriculum.id = component.curriculum_id
                    JOIN course c ON c.id = curriculum.course_id
                    WHERE c.active = TRUE
                )
                SELECT d.id, d.code, d.name, d.workload_hours, d.department,
                    (SELECT string_agg(related.label, ', ' ORDER BY related.label) FROM (
                        SELECT DISTINCT c.code || ' · ' || c.name AS label
                        FROM associated_courses c
                        WHERE c.discipline_id = d.id
                          AND (origin.level_id = 0 OR c.ufam_level_id = origin.level_id)
                        ORDER BY label LIMIT 3
                    ) related) AS grade_courses,
                    (SELECT COUNT(DISTINCT c.course_id) FROM associated_courses c
                        WHERE c.discipline_id = d.id
                          AND (origin.level_id = 0 OR c.ufam_level_id = origin.level_id)) AS grade_course_count
                FROM discipline d CROSS JOIN origin
                WHERE d.active = true AND (d.code ILIKE ? OR d.name ILIKE ?)
                  AND (origin.level_id = 0
                    OR EXISTS (SELECT 1 FROM associated_courses c
                        WHERE c.discipline_id = d.id AND c.ufam_level_id = origin.level_id))
                ORDER BY CASE WHEN d.code ILIKE ? THEN 0 ELSE 1 END, d.name LIMIT 30
                """, (rs, row) -> new CatalogDiscipline((UUID) rs.getObject("id"), rs.getString("code"),
                rs.getString("name"), rs.getInt("workload_hours"), rs.getString("department"),
                rs.getString("grade_courses"), rs.getInt("grade_course_count")),
                levelId, "%" + term + "%", "%" + term + "%", term + "%");
    }

    @GetMapping("/catalog/coverage")
    public CatalogCoverage catalogCoverage() {
        var levels = jdbc.query("""
                SELECT c.ufam_level_id, c.campus, COUNT(*) AS courses,
                       COUNT(processed.course_id) AS indexed_courses
                FROM course c
                LEFT JOIN (SELECT DISTINCT course_id FROM public_grade_course_discipline) processed
                    ON processed.course_id = c.id
                WHERE c.active = TRUE AND c.source = 'UFAM_ECAMPUS'
                GROUP BY c.ufam_level_id, c.campus
                ORDER BY c.ufam_level_id, c.campus
                """, (rs, row) -> new CatalogCoverageLevel(rs.getInt("ufam_level_id"),
                rs.getString("campus"), rs.getLong("courses"), rs.getLong("indexed_courses")));
        long disciplines = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT discipline_id) FROM public_grade_course_discipline
                """, Long.class);
        return new CatalogCoverage(levels.stream().mapToLong(CatalogCoverageLevel::courses).sum(),
                levels.stream().mapToLong(CatalogCoverageLevel::indexedCourses).sum(), disciplines, levels);
    }

    @PostMapping("/catalog/courses/{courseId}/disciplines/import")
    public List<CatalogDiscipline> importCourseDisciplines(@PathVariable UUID courseId) {
        return publicGrades.importCurrentGrade(courseId).stream()
                .map(item -> new CatalogDiscipline(item.id(), item.code(), item.name(),
                        item.workloadHours(), item.department(), null, 0)).toList();
    }

    @GetMapping("/me/subjects")
    public List<Subject> list(@AuthenticationPrincipal Jwt jwt) {
        return listFor(profileId(jwt));
    }

    @PostMapping("/me/subjects")
    @Transactional
    public Subject create(@AuthenticationPrincipal Jwt jwt, @RequestBody SubjectInput input) {
        UUID profileId = profileId(jwt);
        NormalizedSubject normalized = normalize(input, profileId, null);
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO study_subject (id, student_profile_id, discipline_id, code, name, workload_hours,
                    offering_course, section_label, academic_term, category, status, count_as_elective)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, profileId, normalized.disciplineId(), normalized.code(), normalized.name(),
                normalized.workloadHours(), clean(input.offeringCourse(), 180), clean(input.sectionLabel(), 80),
                academicTerm(input.academicTerm()), input.category(), input.status(), input.countAsElective());
        saveMeetings(id, input.meetings());
        return getSubject(profileId, id);
    }

    @PutMapping("/me/subjects/{id}")
    @Transactional
    public Subject update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody SubjectInput input) {
        UUID profileId = profileId(jwt);
        requireManualSubject(profileId, id);
        NormalizedSubject normalized = normalize(input, profileId, id);
        jdbc.update("""
                UPDATE study_subject SET discipline_id = ?, code = ?, name = ?, workload_hours = ?,
                    offering_course = ?, section_label = ?, academic_term = ?, category = ?, status = ?, count_as_elective = ?
                WHERE id = ? AND student_profile_id = ?
                """, normalized.disciplineId(), normalized.code(), normalized.name(), normalized.workloadHours(),
                clean(input.offeringCourse(), 180), clean(input.sectionLabel(), 80), academicTerm(input.academicTerm()), input.category(),
                input.status(), input.countAsElective(), id, profileId);
        jdbc.update("DELETE FROM study_meeting WHERE study_subject_id = ?", id);
        saveMeetings(id, input.meetings());
        return getSubject(profileId, id);
    }

    @DeleteMapping("/me/subjects/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID profileId = profileId(jwt);
        requireManualSubject(profileId, id);
        if (jdbc.update("DELETE FROM study_subject WHERE id = ? AND student_profile_id = ?", id, profileId) == 0)
            throw invalid(HttpStatus.NOT_FOUND, "Disciplina não encontrada.");
    }

    @PostMapping("/me/subjects/{id}/absences")
    @Transactional
    public Absence addAbsence(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody AbsenceInput input) {
        UUID profileId = profileId(jwt);
        List<UUID> locked = jdbc.query("""
                SELECT id FROM study_subject WHERE id = ? AND student_profile_id = ? FOR UPDATE
                """, (rs, row) -> (UUID) rs.getObject("id"), id, profileId);
        if (locked.isEmpty()) throw invalid(HttpStatus.NOT_FOUND, "Disciplina não encontrada.");
        if (input == null || input.missedOn() == null || input.missedHours() < 1 || input.missedHours() > 12)
            throw invalid(HttpStatus.BAD_REQUEST, "Informe uma data e entre 1 e 12 horas de falta.");
        if (input.missedOn().isAfter(LocalDate.now(ZoneId.of("America/Manaus"))))
            throw invalid(HttpStatus.BAD_REQUEST, "Não é possível registrar uma falta em data futura.");
        int weekday = input.missedOn().getDayOfWeek().getValue();
        Integer scheduledHours = jdbc.queryForObject("""
                SELECT COALESCE(sum(end_hour - start_hour), 0)::integer FROM study_meeting
                WHERE study_subject_id = ? AND weekday = ?
                """, Integer.class, id, weekday);
        Integer meetingCount = jdbc.queryForObject(
                "SELECT count(*) FROM study_meeting WHERE study_subject_id = ?", Integer.class, id);
        Integer alreadyMissed = jdbc.queryForObject("""
                SELECT COALESCE(sum(missed_hours), 0)::integer FROM study_absence
                WHERE study_subject_id = ? AND missed_on = ?
                """, Integer.class, id, Date.valueOf(input.missedOn()));
        int dailyLimit = meetingCount != null && meetingCount > 0 ? scheduledHours : 12;
        if (input.missedHours() + (alreadyMissed == null ? 0 : alreadyMissed) > dailyLimit)
            throw invalid(HttpStatus.BAD_REQUEST, dailyLimit == 0
                    ? "Não há aula dessa disciplina neste dia da semana. Revise os horários cadastrados."
                    : "As faltas desta data ultrapassam as horas de aula cadastradas para o dia.");
        UUID absenceId = UUID.randomUUID();
        String note = clean(input.note(), 180);
        jdbc.update("INSERT INTO study_absence (id, study_subject_id, missed_on, missed_hours, note) VALUES (?, ?, ?, ?, ?)",
                absenceId, id, Date.valueOf(input.missedOn()), input.missedHours(), note);
        return new Absence(absenceId, input.missedOn(), input.missedHours(), note);
    }

    @DeleteMapping("/me/subjects/{id}/absences/{absenceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAbsence(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID absenceId) {
        requireSubject(profileId(jwt), id);
        if (jdbc.update("DELETE FROM study_absence WHERE id = ? AND study_subject_id = ?", absenceId, id) == 0)
            throw invalid(HttpStatus.NOT_FOUND, "Falta não encontrada.");
    }

    private UUID profileId(Jwt jwt) {
        return profiles.findByUserId(UUID.fromString(jwt.getSubject()))
                .orElseThrow(() -> invalid(HttpStatus.BAD_REQUEST, "Configure seu perfil acadêmico primeiro."))
                .id();
    }

    private void requireSubject(UUID profileId, UUID id) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM study_subject WHERE id = ? AND student_profile_id = ?",
                Integer.class, id, profileId);
        if (count == null || count == 0) throw invalid(HttpStatus.NOT_FOUND, "Disciplina não encontrada.");
    }

    private void requireManualSubject(UUID profileId, UUID id) {
        List<String> sources = jdbc.query("SELECT source FROM study_subject WHERE id = ? AND student_profile_id = ? FOR UPDATE",
                (rs, row) -> rs.getString("source"), id, profileId);
        if (sources.isEmpty()) throw invalid(HttpStatus.NOT_FOUND, "Disciplina não encontrada.");
        if (!"MANUAL".equals(sources.get(0)))
            throw invalid(HttpStatus.CONFLICT, "Dados importados são somente para consulta. Atualize-os com um novo documento do eCampus.");
    }

    private Subject getSubject(UUID profileId, UUID id) {
        return listFor(profileId).stream().filter(subject -> subject.id().equals(id)).findFirst()
                .orElseThrow(() -> invalid(HttpStatus.NOT_FOUND, "Disciplina não encontrada."));
    }

    private List<Subject> listFor(UUID profileId) {
        return jdbc.query("""
                SELECT s.*, c.code AS profile_course_code, c.name AS profile_course_name,
                    EXISTS (SELECT 1 FROM curriculum_component cc
                        WHERE cc.curriculum_id = sp.curriculum_id AND cc.discipline_id = s.discipline_id) AS in_curriculum
                FROM study_subject s JOIN student_profile sp ON sp.id = s.student_profile_id
                LEFT JOIN course c ON c.id = sp.course_id
                WHERE s.student_profile_id = ? ORDER BY s.name, s.section_label
                """, (rs, row) -> {
            UUID id = (UUID) rs.getObject("id");
            List<Meeting> meetings = jdbc.query("""
                    SELECT id, weekday, start_hour, end_hour FROM study_meeting
                    WHERE study_subject_id = ? ORDER BY weekday, start_hour
                    """, (meeting, index) -> new Meeting((UUID) meeting.getObject("id"),
                    meeting.getInt("weekday"), meeting.getInt("start_hour"), meeting.getInt("end_hour")), id);
            List<Absence> absences = jdbc.query("""
                    SELECT id, missed_on, missed_hours, note FROM study_absence
                    WHERE study_subject_id = ? ORDER BY missed_on DESC, id
                    """, (absence, index) -> new Absence((UUID) absence.getObject("id"),
                    absence.getDate("missed_on").toLocalDate(), absence.getInt("missed_hours"),
                    absence.getString("note")), id);
            UUID disciplineId = (UUID) rs.getObject("discipline_id");
            return new Subject(id, disciplineId, rs.getString("code"), rs.getString("name"),
                    rs.getInt("workload_hours"), rs.getString("offering_course"),
                    rs.getString("section_label"), rs.getString("academic_term"), rs.getString("source"),
                    rs.getString("category"), rs.getString("status"),
                    rs.getBoolean("count_as_elective"), disciplineId != null, rs.getBoolean("in_curriculum"),
                    courseContext(rs.getString("offering_course"), rs.getBoolean("in_curriculum"),
                            rs.getString("profile_course_code"), rs.getString("profile_course_name")), meetings, absences);
        }, profileId);
    }

    private CourseContext courseContext(String offering, boolean inCurriculum, String profileCode, String profileName) {
        if (offering != null && !offering.isBlank()) {
            var code = Pattern.compile("^([A-Za-z]{2,3}\\d{2}(?:-[A-Za-z]+)?)(?=\\s|$|·|—)").matcher(offering.trim());
            if (code.find()) {
                var official = directory.find(code.group(1)).orElse(null);
                if (official != null) return new CourseContext(official.code(), official.name(), official.unitName(),
                        official.unitAbbreviation(), official.officialUrl(), official.sourceUrl(), "OFFERING");
            }
            return new CourseContext(null, offering.trim(), null, null, null, null, "OFFERING");
        }
        if (!inCurriculum || profileCode == null || profileName == null) return null;
        var official = directory.find(profileCode).orElse(null);
        return new CourseContext(profileCode, official == null ? profileName : official.name(),
                official == null ? null : official.unitName(), official == null ? null : official.unitAbbreviation(),
                official == null ? null : official.officialUrl(), official == null ? null : official.sourceUrl(), "CURRICULUM");
    }

    private record NormalizedSubject(UUID disciplineId, String code, String name, int workloadHours) {}

    private NormalizedSubject normalize(SubjectInput input, UUID profileId, UUID existingId) {
        if (input == null || input.category() == null || input.status() == null
                || !List.of("MANDATORY", "ELECTIVE", "EXTERNAL_ELECTIVE").contains(input.category())
                || !List.of("PLANNED", "IN_PROGRESS", "COMPLETED").contains(input.status()))
            throw invalid(HttpStatus.BAD_REQUEST, "Categoria ou situação inválida.");
        if (input.countAsElective() && !"EXTERNAL_ELECTIVE".equals(input.category()))
            throw invalid(HttpStatus.BAD_REQUEST, "Somente optativas externas podem usar o crédito externo.");
        String code = clean(input.code(), 32);
        String name = clean(input.name(), 180);
        int hours = input.workloadHours();
        if (input.disciplineId() != null) {
            List<NormalizedSubject> catalog = jdbc.query("SELECT id, code, name, workload_hours FROM discipline WHERE id = ? AND active = true",
                    (rs, row) -> new NormalizedSubject((UUID) rs.getObject("id"), rs.getString("code"),
                            rs.getString("name"), rs.getInt("workload_hours")), input.disciplineId());
            if (catalog.isEmpty()) throw invalid(HttpStatus.BAD_REQUEST, "Disciplina não encontrada no catálogo.");
            NormalizedSubject selected = catalog.get(0);
            code = selected.code(); name = selected.name(); hours = selected.workloadHours();
        }
        if (code == null || name == null || hours < 1 || hours > 600)
            throw invalid(HttpStatus.BAD_REQUEST, "Informe código, nome e carga horária válida.");
        String term = academicTerm(input.academicTerm());
        String section = clean(input.sectionLabel(), 80);
        if (term != null && section != null) {
            Integer duplicates = jdbc.queryForObject("""
                    SELECT count(*) FROM study_subject WHERE student_profile_id = ?
                        AND academic_term = ? AND upper(code) = upper(?)
                        AND upper(section_label) = upper(?) AND id <> ?
                    """, Integer.class, profileId, term, code, section,
                    existingId == null ? new UUID(0, 0) : existingId);
            if (duplicates != null && duplicates > 0)
                throw invalid(HttpStatus.CONFLICT, "Esta turma já está cadastrada neste semestre.");
        }
        if (input.countAsElective()) {
            Integer inMatrix = jdbc.queryForObject("""
                    SELECT count(*) FROM curriculum_component cc
                    JOIN discipline d ON d.id = cc.discipline_id
                    JOIN student_profile sp ON sp.curriculum_id = cc.curriculum_id
                    WHERE sp.id = ? AND upper(d.code) = upper(?)
                    """, Integer.class, profileId, code);
            if (inMatrix != null && inMatrix > 0)
                throw invalid(HttpStatus.BAD_REQUEST, "Esta disciplina já pertence à sua matriz. Marque-a diretamente no mapa.");
            Integer duplicates = jdbc.queryForObject("""
                    SELECT count(*) FROM study_subject WHERE student_profile_id = ? AND upper(code) = upper(?)
                    AND count_as_elective = true AND id <> ?
                    """, Integer.class, profileId, code, existingId == null ? new UUID(0, 0) : existingId);
            if (duplicates != null && duplicates > 0)
                throw invalid(HttpStatus.CONFLICT, "Esta disciplina já foi adicionada como optativa externa.");
        }
        return new NormalizedSubject(input.disciplineId(), code, name, hours);
    }

    private void saveMeetings(UUID subjectId, List<MeetingInput> meetings) {
        if (meetings == null) return;
        if (meetings.size() > 24) throw invalid(HttpStatus.BAD_REQUEST, "Há horários demais nesta disciplina.");
        List<String> unique = new ArrayList<>();
        for (MeetingInput meeting : meetings) {
            if (meeting.weekday() < 1 || meeting.weekday() > 6 ||
                    !List.of(8, 10, 14, 16, 18, 20).contains(meeting.startHour()))
                throw invalid(HttpStatus.BAD_REQUEST, "Escolha um horário entre 08h e 22h, em blocos de 2h.");
            String key = meeting.weekday() + ":" + meeting.startHour();
            if (unique.contains(key)) continue;
            unique.add(key);
            jdbc.update("INSERT INTO study_meeting (id, study_subject_id, weekday, start_hour, end_hour) VALUES (?, ?, ?, ?, ?)",
                    UUID.randomUUID(), subjectId, meeting.weekday(), meeting.startHour(), meeting.startHour() + 2);
        }
    }

    private String clean(String value, int max) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) throw invalid(HttpStatus.BAD_REQUEST, "Um dos textos informados é longo demais.");
        return trimmed;
    }

    private String academicTerm(String value) {
        if (value == null || value.isBlank()) return null;
        String term = value.trim();
        if (!term.matches("20\\d{2}/[12]"))
            throw invalid(HttpStatus.BAD_REQUEST, "Informe o semestre no formato AAAA/1 ou AAAA/2.");
        return term;
    }

    private ProgressException invalid(HttpStatus status, String message) {
        return new ProgressException(status, "study_plan_invalid", message);
    }
}
