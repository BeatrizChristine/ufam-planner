package br.edu.ufam.planner.schedule.application;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import br.edu.ufam.planner.progress.application.ProgressException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EcampusEnrollmentImportService {
    private final EcampusDocumentParser parser;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public EcampusEnrollmentImportService(EcampusDocumentParser parser, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.parser = parser;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public record ComparedSubject(String code, String name, int workloadHours, String sectionLabel,
            List<EcampusDocumentParser.Meeting> meetings, boolean nameNeedsReview,
            String action, UUID existingId, int recordedAbsences, String explanation, String category) {}
    public record Preview(String courseCode, String term, String studentName, String registrationNumber,
            Integer admissionYear, Integer admissionTerm, List<ComparedSubject> subjects,
            int totalWorkloadHours, List<String> warnings) {}
    public record Choice(String code, String sectionLabel, String name, UUID associateId) {}
    public record Result(String term, int created, int updated, int unchanged) {}
    private record Context(UUID profileId, UUID curriculumId, String courseCode) {}
    private record Existing(UUID id, String term, String section, String name, int hours,
            String category, String status, String source, int absences) {}
    private record CatalogMatch(UUID id, int hours) {}

    public Preview preview(UUID userId, MultipartFile file) {
        var document = parser.enrollment(file);
        var context = context(userId);
        verifyDocument(document, context);
        List<ComparedSubject> subjects = new ArrayList<>();
        for (var row : document.subjects()) {
            var comparison = compare(context.profileId(), document.term(), row);
            subjects.add(new ComparedSubject(row.code(), row.name(), row.workloadHours(), row.sectionLabel(),
                    row.meetings(), row.nameNeedsReview(), comparison.action(), comparison.existingId(),
                    comparison.recordedAbsences(), comparison.explanation(), category(context.curriculumId(), row.code())));
        }
        return new Preview(document.courseCode(), document.term(), document.studentName(), document.registrationNumber(),
                document.admissionYear(), document.admissionTerm(), subjects,
                document.totalWorkloadHours(), document.warnings());
    }

    @Transactional
    public Result confirm(UUID userId, MultipartFile file, String selectionJson) {
        var document = parser.enrollment(file);
        var context = context(userId);
        verifyDocument(document, context);
        List<Choice> choices;
        try {
            choices = mapper.readValue(selectionJson, new TypeReference<>() {});
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            throw invalid("A seleção da importação é inválida. Gere uma nova prévia.");
        }
        if (choices == null || choices.isEmpty() || choices.size() > 50)
            throw invalid("Selecione entre 1 e 50 disciplinas para importar.");
        Map<String, EcampusDocumentParser.EnrollmentSubject> rows = new HashMap<>();
        for (var row : document.subjects()) rows.put(key(row.code(), row.sectionLabel()), row);
        Set<String> seen = new HashSet<>();
        int created = 0, updated = 0, unchanged = 0;
        for (var choice : choices) {
            if (choice == null || choice.code() == null || choice.sectionLabel() == null)
                throw invalid("Há uma disciplina inválida na seleção.");
            String key = key(choice.code(), choice.sectionLabel());
            var row = rows.get(key);
            if (row == null || !seen.add(key))
                throw invalid("A seleção não corresponde ao comprovante ou contém duplicatas.");
            String name = choice.name() == null ? row.name() : choice.name().trim();
            if (name.isBlank() || name.length() > 180) throw invalid("Revise o nome de " + row.code() + ".");
            var comparison = compare(context.profileId(), document.term(), row);
            if (comparison.action().equals("BLOCKED"))
                throw invalid("Revise " + row.code() + " no seu plano antes de importar.");
            if (comparison.action().equals("REVIEW") && !comparison.existingId().equals(choice.associateId()))
                throw invalid("Confirme a associação de " + row.code() + " à disciplina existente.");
            if (!comparison.action().equals("REVIEW") && choice.associateId() != null)
                throw invalid("A comparação mudou. Gere uma nova prévia antes de importar.");
            String category = category(context.curriculumId(), row.code());
            UUID disciplineId = catalogId(row.code(), row.workloadHours());
            if (comparison.existingId() == null) {
                UUID id = UUID.randomUUID();
                jdbc.update("""
                        INSERT INTO study_subject (id, student_profile_id, discipline_id, code, name,
                            workload_hours, section_label, academic_term, source, category, status, count_as_elective)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ECAMPUS_ENROLLMENT', ?, 'IN_PROGRESS', false)
                        """, id, context.profileId(), disciplineId, row.code(), name,
                        row.workloadHours(), row.sectionLabel(), document.term(), category);
                saveMeetings(id, row.meetings());
                created++;
            } else {
                UUID id = comparison.existingId();
                if (comparison.action().equals("UNCHANGED") && name.equals(row.name())) {
                    unchanged++;
                    continue;
                }
                jdbc.update("""
                        UPDATE study_subject SET discipline_id = ?, code = ?, name = ?, workload_hours = ?,
                            section_label = ?, academic_term = ?, source = 'ECAMPUS_ENROLLMENT',
                            category = ?, status = 'IN_PROGRESS',
                            count_as_elective = CASE WHEN ? = 'EXTERNAL_ELECTIVE' THEN count_as_elective ELSE false END
                        WHERE id = ? AND student_profile_id = ?
                        """, disciplineId, row.code(), name, row.workloadHours(), row.sectionLabel(),
                        document.term(), category, category, id, context.profileId());
                jdbc.update("DELETE FROM study_meeting WHERE study_subject_id = ?", id);
                saveMeetings(id, row.meetings());
                updated++;
            }
        }
        return new Result(document.term(), created, updated, unchanged);
    }

    private record Comparison(String action, UUID existingId, int recordedAbsences, String explanation) {}

    private Comparison compare(UUID profileId, String term, EcampusDocumentParser.EnrollmentSubject row) {
        List<Existing> sameCode = jdbc.query("""
                SELECT s.id, s.academic_term, s.section_label, s.name, s.workload_hours,
                    s.category, s.status, s.source,
                    (SELECT count(*) FROM study_absence a WHERE a.study_subject_id = s.id) AS absences
                FROM study_subject s WHERE s.student_profile_id = ? AND upper(s.code) = upper(?)
                    AND (s.academic_term = ? OR s.academic_term IS NULL)
                ORDER BY s.created_at
                """, (rs, index) -> new Existing((UUID) rs.getObject("id"), rs.getString("academic_term"),
                rs.getString("section_label"), rs.getString("name"), rs.getInt("workload_hours"),
                rs.getString("category"), rs.getString("status"), rs.getString("source"),
                rs.getInt("absences")), profileId, row.code(), term);
        List<Existing> exact = sameCode.stream().filter(item -> term.equals(item.term())
                && row.sectionLabel().equalsIgnoreCase(item.section() == null ? "" : item.section())).toList();
        if (exact.size() > 1) return new Comparison("BLOCKED", null, 0, "Há registros duplicados neste semestre.");
        if (exact.size() == 1) {
            Existing item = exact.get(0);
            if (item.status().equals("COMPLETED"))
                return new Comparison("BLOCKED", item.id(), item.absences(), "Já consta como concluída neste semestre.");
            boolean same = item.hours() == row.workloadHours()
                    && item.status().equals("IN_PROGRESS") && item.source().equals("ECAMPUS_ENROLLMENT")
                    && meetingsMatch(item.id(), row.meetings());
            return new Comparison(same ? "UNCHANGED" : "UPDATE", item.id(), item.absences(),
                    same ? "Já está no seu quadro; nenhuma alteração necessária."
                            : "Atualizar turma e horários deste semestre, preservando as faltas.");
        }
        if (sameCode.isEmpty())
            return new Comparison("NEW", null, 0, "Adicionar ao quadro e à frequência deste semestre.");
        List<Existing> candidates = sameCode.stream().filter(item -> !item.status().equals("COMPLETED")).toList();
        if (sameCode.size() == 1 && candidates.size() == 1) {
            Existing item = candidates.get(0);
            String explanation = item.term() == null
                    ? "Há um registro sem semestre. Associe-o somente se for esta mesma matrícula; as faltas serão preservadas."
                    : "Há outra turma desta disciplina no semestre. Confirme se deseja substituir a turma; as faltas serão preservadas.";
            return new Comparison("REVIEW", item.id(), item.absences(), explanation);
        }
        return new Comparison("BLOCKED", null, 0,
                "Há mais de um registro possível. Revise as turmas manualmente antes de importar.");
    }

    private boolean meetingsMatch(UUID subjectId, List<EcampusDocumentParser.Meeting> imported) {
        List<String> existing = jdbc.query("""
                SELECT weekday, start_hour FROM study_meeting WHERE study_subject_id = ?
                """, (rs, index) -> rs.getInt("weekday") + ":" + rs.getInt("start_hour"), subjectId);
        Set<String> expected = new HashSet<>();
        for (var meeting : imported) expected.add(meeting.weekday() + ":" + meeting.startHour());
        return existing.size() == expected.size() && expected.containsAll(existing);
    }

    private Context context(UUID userId) {
        List<Context> rows = jdbc.query("""
                SELECT sp.id, sp.curriculum_id, c.code AS course_code
                FROM student_profile sp JOIN course c ON c.id = sp.course_id WHERE sp.user_id = ?
                """, (rs, index) -> new Context((UUID) rs.getObject("id"),
                (UUID) rs.getObject("curriculum_id"), rs.getString("course_code")), userId);
        if (rows.isEmpty()) throw invalid("Configure seu curso no perfil antes de importar.");
        return rows.get(0);
    }

    private void verifyDocument(EcampusDocumentParser.EnrollmentPreview document, Context context) {
        if (document.courseCode() == null || !document.courseCode().equalsIgnoreCase(context.courseCode()))
            throw invalid("O curso do comprovante não corresponde ao curso vinculado ao seu perfil.");
        if (document.term() == null) throw invalid("O semestre não foi identificado no comprovante.");
    }

    private String category(UUID curriculumId, String code) {
        if (curriculumId == null) return "EXTERNAL_ELECTIVE";
        List<String> types = jdbc.query("""
                SELECT cc.component_type FROM curriculum_component cc
                JOIN discipline d ON d.id = cc.discipline_id
                WHERE cc.curriculum_id = ? AND upper(d.code) = upper(?)
                """, (rs, index) -> rs.getString(1), curriculumId, code);
        if (types.isEmpty()) return "EXTERNAL_ELECTIVE";
        return types.get(0).equals("MANDATORY") ? "MANDATORY" : "ELECTIVE";
    }

    private UUID catalogId(String code, int hours) {
        List<CatalogMatch> matches = jdbc.query("""
                SELECT id, workload_hours FROM discipline WHERE active = true AND upper(code) = upper(?)
                """, (rs, index) -> new CatalogMatch((UUID) rs.getObject("id"), rs.getInt("workload_hours")), code);
        return matches.stream().filter(match -> match.hours() == hours).map(CatalogMatch::id).findFirst().orElse(null);
    }

    private void saveMeetings(UUID subjectId, List<EcampusDocumentParser.Meeting> meetings) {
        for (var meeting : meetings) jdbc.update("""
                INSERT INTO study_meeting (id, study_subject_id, weekday, start_hour, end_hour)
                VALUES (?, ?, ?, ?, ?)
                """, UUID.randomUUID(), subjectId, meeting.weekday(), meeting.startHour(), meeting.startHour() + 2);
    }

    private static String key(String code, String section) {
        return code.trim().toUpperCase() + ":" + section.trim().toUpperCase();
    }

    private ProgressException invalid(String message) {
        return new ProgressException(HttpStatus.BAD_REQUEST, "ecampus_import_invalid", message);
    }
}
