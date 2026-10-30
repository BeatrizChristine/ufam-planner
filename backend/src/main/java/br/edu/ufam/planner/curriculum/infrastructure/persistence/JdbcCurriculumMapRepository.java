package br.edu.ufam.planner.curriculum.infrastructure.persistence;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.curriculum.domain.CurriculumMap;
import br.edu.ufam.planner.curriculum.domain.CurriculumMapRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JdbcCurriculumMapRepository implements CurriculumMapRepository {

    private final JdbcClient jdbc;

    JdbcCurriculumMapRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<CurriculumMap> findById(UUID curriculumId) {
        var header = jdbc.sql("""
                SELECT curriculum.id,
                       curriculum.code,
                       curriculum.effective_from,
                       curriculum.total_workload_hours,
                       curriculum.mandatory_workload_hours,
                       curriculum.elective_workload_hours,
                       curriculum.extension_workload_hours,
                       curriculum.expected_periods,
                       course.code AS course_code,
                       course.name AS course_name
                  FROM curriculum
                  JOIN course ON course.id = curriculum.course_id
                 WHERE curriculum.id = :curriculumId
                   AND curriculum.active = TRUE
                """)
                .param("curriculumId", curriculumId)
                .query((resultSet, rowNumber) -> new Header(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("code"),
                        resultSet.getObject("effective_from", java.time.LocalDate.class),
                        resultSet.getInt("total_workload_hours"),
                        resultSet.getObject("mandatory_workload_hours", Integer.class),
                        resultSet.getObject("elective_workload_hours", Integer.class),
                        resultSet.getObject("extension_workload_hours", Integer.class),
                        resultSet.getInt("expected_periods"),
                        resultSet.getString("course_code"),
                        resultSet.getString("course_name")))
                .optional();

        if (header.isEmpty()) {
            return Optional.empty();
        }

        var source = findSource(curriculumId).orElse(null);
        var prerequisites = new HashMap<String, List<String>>();
        var unlocks = new HashMap<String, List<String>>();
        loadRelationships(curriculumId, prerequisites, unlocks);

        var components = jdbc.sql("""
                SELECT component.id AS component_id,
                       discipline.id AS discipline_id,
                       discipline.code,
                       discipline.name,
                       discipline.workload_hours,
                       component.suggested_period,
                       component.component_type
                  FROM curriculum_component component
                  JOIN discipline ON discipline.id = component.discipline_id
                 WHERE component.curriculum_id = :curriculumId
                   AND discipline.active = TRUE
                 ORDER BY component.suggested_period,
                          CASE component.component_type WHEN 'MANDATORY' THEN 0 ELSE 1 END,
                          discipline.code
                """)
                .param("curriculumId", curriculumId)
                .query((resultSet, rowNumber) -> {
                    var code = resultSet.getString("code");
                    var period = resultSet.getObject("suggested_period", Integer.class);
                    return new CurriculumMap.Component(
                            resultSet.getObject("component_id", UUID.class),
                            resultSet.getObject("discipline_id", UUID.class),
                            code,
                            resultSet.getString("name"),
                            resultSet.getInt("workload_hours"),
                            period,
                            resultSet.getString("component_type"),
                            List.copyOf(prerequisites.getOrDefault(code, List.of())),
                            List.copyOf(unlocks.getOrDefault(code, List.of())));
                })
                .list();

        var value = header.get();
        return Optional.of(new CurriculumMap(
                value.id(),
                value.code(),
                value.effectiveFrom(),
                value.courseCode(),
                value.courseName(),
                value.totalWorkloadHours(),
                value.mandatoryWorkloadHours(),
                value.electiveWorkloadHours(),
                value.extensionWorkloadHours(),
                value.expectedPeriods(),
                source,
                components));
    }

    private Optional<CurriculumMap.Source> findSource(UUID curriculumId) {
        return jdbc.sql("""
                SELECT source_url,
                       source_title,
                       source_version,
                       published_at,
                       captured_at,
                       trust_status,
                       prerequisite_data_available,
                       notes
                  FROM curriculum_source_snapshot
                 WHERE curriculum_id = :curriculumId
                 ORDER BY captured_at DESC
                 LIMIT 1
                """)
                .param("curriculumId", curriculumId)
                .query((resultSet, rowNumber) -> new CurriculumMap.Source(
                        resultSet.getString("source_url"),
                        resultSet.getString("source_title"),
                        resultSet.getString("source_version"),
                        toInstant(resultSet.getTimestamp("published_at")),
                        toInstant(resultSet.getTimestamp("captured_at")),
                        resultSet.getString("trust_status"),
                        resultSet.getBoolean("prerequisite_data_available"),
                        resultSet.getString("notes")))
                .optional();
    }

    private void loadRelationships(
            UUID curriculumId,
            Map<String, List<String>> prerequisites,
            Map<String, List<String>> unlocks) {
        jdbc.sql("""
                SELECT discipline.code AS discipline_code,
                       prerequisite.code AS prerequisite_code
                  FROM discipline_prerequisite relationship
                  JOIN discipline ON discipline.id = relationship.discipline_id
                  JOIN discipline prerequisite ON prerequisite.id = relationship.prerequisite_id
                 WHERE relationship.curriculum_id = :curriculumId
                 ORDER BY discipline.code, prerequisite.code
                """)
                .param("curriculumId", curriculumId)
                .query((resultSet, rowNumber) -> new Relationship(
                        resultSet.getString("discipline_code"),
                        resultSet.getString("prerequisite_code")))
                .list()
                .forEach(relationship -> {
                    prerequisites.computeIfAbsent(relationship.disciplineCode(), ignored -> new ArrayList<>())
                            .add(relationship.prerequisiteCode());
                    unlocks.computeIfAbsent(relationship.prerequisiteCode(), ignored -> new ArrayList<>())
                            .add(relationship.disciplineCode());
                });
    }

    private static java.time.Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private record Header(
            UUID id,
            String code,
            java.time.LocalDate effectiveFrom,
            int totalWorkloadHours,
            Integer mandatoryWorkloadHours,
            Integer electiveWorkloadHours,
            Integer extensionWorkloadHours,
            int expectedPeriods,
            String courseCode,
            String courseName) {
    }

    private record Relationship(String disciplineCode, String prerequisiteCode) {
    }
}
