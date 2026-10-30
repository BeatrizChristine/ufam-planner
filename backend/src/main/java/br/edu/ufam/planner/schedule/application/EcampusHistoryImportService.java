package br.edu.ufam.planner.schedule.application;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import br.edu.ufam.planner.progress.application.CompletedDisciplineService;
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
public class EcampusHistoryImportService {
    private final EcampusDocumentParser parser;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final CompletedDisciplineService completed;

    public EcampusHistoryImportService(EcampusDocumentParser parser, JdbcTemplate jdbc,
            ObjectMapper mapper, CompletedDisciplineService completed) {
        this.parser = parser;
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.completed = completed;
    }

    public record Choice(String code, String name) {}
    public record Result(int added, int unchanged, List<String> completedCodes) {}
    private record Context(UUID profileId, UUID curriculumId, String courseCode) {}
    private record MatrixMatch(UUID disciplineId, int workloadHours) {}
    private record ExistingExternal(UUID id, String status, boolean countAsElective, String source) {}

    @Transactional
    public Result confirm(UUID userId, MultipartFile file, String selectionJson) {
        var document = parser.history(file);
        var context = context(userId);
        if (document.courseCode() == null || !document.courseCode().equalsIgnoreCase(context.courseCode()))
            throw invalid("O histórico não corresponde ao curso do seu perfil.");
        if (context.curriculumId() == null)
            throw invalid("Vincule uma matriz ao perfil antes de importar o histórico.");
        List<Choice> choices;
        try {
            choices = mapper.readValue(selectionJson, new TypeReference<>() {});
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            throw invalid("A seleção do histórico é inválida. Gere uma nova prévia.");
        }
        if (choices == null || choices.isEmpty() || choices.size() > 120)
            throw invalid("Selecione entre 1 e 120 disciplinas para importar.");
        Map<String, EcampusDocumentParser.HistorySubject> rows = new HashMap<>();
        for (var row : document.completed()) rows.put(row.code().toUpperCase(), row);
        Set<String> seen = new HashSet<>();
        Set<String> completedCodes = new HashSet<>(completed.getCompletedCodes(userId));
        int added = 0, unchanged = 0;
        for (var choice : choices) {
            if (choice == null || choice.code() == null) throw invalid("Há uma disciplina inválida na seleção.");
            String code = choice.code().trim().toUpperCase();
            var row = rows.get(code);
            if (row == null || !seen.add(code))
                throw invalid("A seleção não corresponde ao histórico ou contém duplicatas.");
            String name = choice.name() == null ? row.name() : choice.name().trim();
            if (name.isBlank() || name.length() > 180) throw invalid("Revise o nome de " + code + ".");
            MatrixMatch matrix = matrix(context.curriculumId(), code);
            if (matrix != null) {
                if (matrix.workloadHours() != row.workloadHours())
                    throw invalid("A carga horária de " + code + " difere da matriz vinculada. Confira a versão.");
                if (completedCodes.contains(code)) unchanged++;
                else {
                    completed.setCompletedFromHistory(userId, matrix.disciplineId());
                    completedCodes.add(code);
                    added++;
                }
            } else if (row.category().equals("ELECTIVE")) {
                ExistingExternal existing = external(context.profileId(), code);
                if (existing != null && existing.status().equals("COMPLETED") && existing.countAsElective()
                        && existing.source().equals("ECAMPUS_HISTORY")) {
                    unchanged++;
                    continue;
                }
                if (existing != null && existing.countAsElective() && !existing.status().equals("COMPLETED"))
                    throw invalid(code + " já está em curso como optativa. Revise antes de importar o crédito do histórico.");
                UUID catalogId = catalogId(code, row.workloadHours());
                if (existing == null) {
                    jdbc.update("""
                            INSERT INTO study_subject (id, student_profile_id, discipline_id, code, name,
                                workload_hours, category, status, count_as_elective, source)
                            VALUES (?, ?, ?, ?, ?, ?, 'EXTERNAL_ELECTIVE', 'COMPLETED', true, 'ECAMPUS_HISTORY')
                            """, UUID.randomUUID(), context.profileId(), catalogId, code, name, row.workloadHours());
                } else {
                    jdbc.update("""
                            UPDATE study_subject SET discipline_id = ?, name = ?, workload_hours = ?,
                                status = 'COMPLETED', count_as_elective = true, source = 'ECAMPUS_HISTORY'
                            WHERE id = ? AND student_profile_id = ?
                            """, catalogId, name, row.workloadHours(), existing.id(), context.profileId());
                }
                added++;
            } else {
                throw invalid(code + " não consta da matriz vinculada ao perfil.");
            }
        }
        return new Result(added, unchanged, List.copyOf(completedCodes));
    }

    private Context context(UUID userId) {
        List<Context> rows = jdbc.query("""
                SELECT sp.id, sp.curriculum_id, c.code AS course_code
                FROM student_profile sp JOIN course c ON c.id = sp.course_id WHERE sp.user_id = ?
                """, (rs, index) -> new Context((UUID) rs.getObject("id"),
                (UUID) rs.getObject("curriculum_id"), rs.getString("course_code")), userId);
        if (rows.isEmpty()) throw invalid("Configure seu perfil acadêmico antes de importar.");
        return rows.get(0);
    }

    private MatrixMatch matrix(UUID curriculumId, String code) {
        List<MatrixMatch> rows = jdbc.query("""
                SELECT cc.discipline_id, d.workload_hours FROM curriculum_component cc
                JOIN discipline d ON d.id = cc.discipline_id
                WHERE cc.curriculum_id = ? AND upper(d.code) = upper(?)
                """, (rs, index) -> new MatrixMatch((UUID) rs.getObject("discipline_id"),
                rs.getInt("workload_hours")), curriculumId, code);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private ExistingExternal external(UUID profileId, String code) {
        List<ExistingExternal> rows = jdbc.query("""
                SELECT id, status, count_as_elective, source FROM study_subject
                WHERE student_profile_id = ? AND upper(code) = upper(?)
                    AND category = 'EXTERNAL_ELECTIVE'
                    AND (status = 'COMPLETED' OR count_as_elective = true)
                ORDER BY count_as_elective DESC, created_at DESC LIMIT 1
                """, (rs, index) -> new ExistingExternal((UUID) rs.getObject("id"),
                rs.getString("status"), rs.getBoolean("count_as_elective"), rs.getString("source")), profileId, code);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private UUID catalogId(String code, int hours) {
        List<UUID> rows = jdbc.query("""
                SELECT id FROM discipline WHERE active = true AND upper(code) = upper(?) AND workload_hours = ?
                """, (rs, index) -> (UUID) rs.getObject("id"), code, hours);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private ProgressException invalid(String message) {
        return new ProgressException(HttpStatus.BAD_REQUEST, "ecampus_history_import_invalid", message);
    }
}
