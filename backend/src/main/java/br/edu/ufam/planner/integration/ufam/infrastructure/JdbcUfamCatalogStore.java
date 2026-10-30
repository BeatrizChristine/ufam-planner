package br.edu.ufam.planner.integration.ufam.infrastructure;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import br.edu.ufam.planner.integration.ufam.application.UfamCatalogStore;
import br.edu.ufam.planner.integration.ufam.application.UfamCourse;
import br.edu.ufam.planner.integration.ufam.application.UfamCurriculumVersion;
import br.edu.ufam.planner.integration.ufam.application.UfamIntegrationException;
import br.edu.ufam.planner.integration.ufam.application.UfamIntegrationStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
class JdbcUfamCatalogStore implements UfamCatalogStore {

    private static final String SOURCE = "UFAM_ECAMPUS";

    private final JdbcClient jdbc;

    JdbcUfamCatalogStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public UUID startSync(String resource, Instant startedAt) {
        var id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO external_sync_run (id, source, resource, status, started_at)
                VALUES (:id, :source, :resource, 'RUNNING', :startedAt)
                """)
                .param("id", id)
                .param("source", SOURCE)
                .param("resource", resource)
                .param("startedAt", Timestamp.from(startedAt))
                .update();
        return id;
    }

    @Override
    public void completeSync(UUID syncId, int itemsProcessed, Instant completedAt) {
        jdbc.sql("""
                UPDATE external_sync_run
                   SET status = 'SUCCESS', items_processed = :items, completed_at = :completedAt
                 WHERE id = :id
                """)
                .param("items", itemsProcessed)
                .param("completedAt", Timestamp.from(completedAt))
                .param("id", syncId)
                .update();
    }

    @Override
    public void failSync(UUID syncId, String errorMessage, Instant completedAt) {
        jdbc.sql("""
                UPDATE external_sync_run
                   SET status = 'FAILED', error_message = :error, completed_at = :completedAt
                 WHERE id = :id
                """)
                .param("error", errorMessage)
                .param("completedAt", Timestamp.from(completedAt))
                .param("id", syncId)
                .update();
    }

    @Override
    @Transactional
    public int saveCourses(List<UfamCourse> courses, String campus, int levelId, Instant syncedAt) {
        for (var course : courses) {
            jdbc.sql("""
                    INSERT INTO course (
                        id, code, name, campus, active, source, external_id, synced_at, ufam_level_id
                    ) VALUES (
                        :id, :code, :name, :campus, TRUE, :source, :externalId, :syncedAt, :levelId
                    )
                    ON CONFLICT (code, campus) DO UPDATE SET
                        name = EXCLUDED.name,
                        active = TRUE,
                        source = EXCLUDED.source,
                        external_id = EXCLUDED.external_id,
                        synced_at = EXCLUDED.synced_at,
                        ufam_level_id = EXCLUDED.ufam_level_id
                    """)
                    .param("id", stableId("course:" + course.externalId()))
                    .param("code", course.code())
                    .param("name", course.name())
                    .param("campus", campus)
                    .param("levelId", levelId)
                    .param("source", SOURCE)
                    .param("externalId", course.externalId())
                    .param("syncedAt", Timestamp.from(syncedAt))
                    .update();
        }
        return courses.size();
    }

    @Override
    public CourseSource findCourseSource(UUID courseId) {
        return jdbc.sql("""
                SELECT id, external_id, code
                  FROM course
                 WHERE id = :id AND active = TRUE
                """)
                .param("id", courseId)
                .query((resultSet, rowNumber) -> new CourseSource(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("external_id"),
                        resultSet.getString("code")))
                .optional()
                .orElseThrow(() -> new UfamIntegrationException(
                        "course_not_found",
                        "O curso informado não foi encontrado."));
    }

    @Override
    @Transactional
    public int saveCurriculumVersions(UUID courseId, List<UfamCurriculumVersion> versions, Instant syncedAt) {
        for (var version : versions) {
            jdbc.sql("""
                    INSERT INTO ufam_curriculum_version (
                        id, course_id, external_id, code, status, source, active, synced_at
                    ) VALUES (
                        :id, :courseId, :externalId, :code, :status, :source, TRUE, :syncedAt
                    )
                    ON CONFLICT (source, external_id) DO UPDATE SET
                        course_id = EXCLUDED.course_id,
                        code = EXCLUDED.code,
                        status = EXCLUDED.status,
                        active = TRUE,
                        synced_at = EXCLUDED.synced_at
                    """)
                    .param("id", stableId("curriculum:" + version.externalId()))
                    .param("courseId", courseId)
                    .param("externalId", version.externalId())
                    .param("code", version.code())
                    .param("status", version.status())
                    .param("source", SOURCE)
                    .param("syncedAt", Timestamp.from(syncedAt))
                    .update();
        }
        return versions.size();
    }

    @Override
    public UfamIntegrationStatus status(String baseUrl) {
        var lastRun = jdbc.sql("""
                SELECT resource, status, items_processed, completed_at
                  FROM external_sync_run
                 WHERE source = :source
                 ORDER BY started_at DESC
                 LIMIT 1
                """)
                .param("source", SOURCE)
                .query((resultSet, rowNumber) -> new LastRun(
                        resultSet.getString("resource"),
                        resultSet.getString("status"),
                        resultSet.getInt("items_processed"),
                        resultSet.getTimestamp("completed_at") == null
                                ? null
                                : resultSet.getTimestamp("completed_at").toInstant()))
                .optional()
                .orElse(null);

        var courseCount = jdbc.sql("SELECT COUNT(*) FROM course WHERE source = :source")
                .param("source", SOURCE)
                .query(Long.class)
                .single();
        var versionCount = jdbc.sql("SELECT COUNT(*) FROM ufam_curriculum_version WHERE source = :source")
                .param("source", SOURCE)
                .query(Long.class)
                .single();

        return new UfamIntegrationStatus(
                SOURCE,
                baseUrl,
                lastRun == null ? "NEVER_SYNCED" : lastRun.status(),
                lastRun == null ? null : lastRun.resource(),
                lastRun == null ? null : lastRun.itemsProcessed(),
                lastRun == null ? null : lastRun.completedAt(),
                courseCount,
                versionCount);
    }

    private static UUID stableId(String value) {
        return UUID.nameUUIDFromBytes((SOURCE + ":" + value).getBytes(StandardCharsets.UTF_8));
    }

    private record LastRun(String resource, String status, int itemsProcessed, Instant completedAt) {
    }
}
