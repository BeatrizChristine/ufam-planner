package br.edu.ufam.planner.integration.ufam.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Slowly indexes current public grades; never makes a student's search depend on eCampus availability. */
@Service
public class UfamGradeCatalogSyncService {
    private static final Logger LOG = LoggerFactory.getLogger(UfamGradeCatalogSyncService.class);
    private static final int[] UNDERGRADUATE_LEVELS = {3, 13, 14, 15, 16, 17, 18, 20, 22};
    private final JdbcTemplate jdbc;
    private final UfamCatalogSyncService courses;
    private final UfamPublicGradeService grades;
    @Value("${app.integrations.ufam.catalog-auto-sync-enabled:true}")
    private boolean autoSyncEnabled;
    @Value("${app.integrations.ufam.catalog-sync-batch-size:5}")
    private int scheduledBatchSize;

    public record BatchResult(int attempted, int imported, int failed) {}

    public UfamGradeCatalogSyncService(JdbcTemplate jdbc, UfamCatalogSyncService courses,
            UfamPublicGradeService grades) {
        this.jdbc = jdbc;
        this.courses = courses;
        this.grades = grades;
    }

    @Scheduled(initialDelayString = "${app.integrations.ufam.catalog-sync-initial-delay-ms:60000}",
            fixedDelayString = "${app.integrations.ufam.catalog-sync-delay-ms:900000}")
    public void scheduledBatch() {
        if (!autoSyncEnabled) return;
        try {
            syncNextBatch(Math.max(1, Math.min(scheduledBatchSize, 10)));
        } catch (RuntimeException exception) {
            LOG.warn("Public UFAM grade catalog batch could not run: {}", exception.getMessage());
        }
    }

    public synchronized BatchResult syncNextBatch(int limit) {
        if (limit < 1 || limit > 10) throw new IllegalArgumentException("O lote deve ter entre 1 e 10 cursos.");
        refreshCourseDirectories();
        List<UUID> pending = jdbc.query("""
                SELECT c.id FROM course c
                LEFT JOIN public_grade_course_sync s ON s.course_id = c.id
                WHERE c.active = TRUE AND c.source = 'UFAM_ECAMPUS' AND c.external_id IS NOT NULL
                  AND (s.course_id IS NULL
                    OR (s.status = 'FAILED' AND s.attempted_at < NOW() - INTERVAL '1 day')
                    OR (s.status = 'SUCCESS' AND s.synced_at < NOW() - INTERVAL '30 days'))
                ORDER BY CASE WHEN c.ufam_level_id = 3 THEN 0
                              WHEN c.ufam_level_id IN (14, 15, 16, 17, 18) THEN 1
                              ELSE 2 END,
                         s.attempted_at NULLS FIRST, c.code, c.id
                LIMIT ?
                """, (rs, row) -> (UUID) rs.getObject(1), limit);
        int imported = 0, failed = 0;
        for (UUID courseId : pending) {
            try {
                grades.importCurrentGrade(courseId);
                imported++;
            } catch (RuntimeException exception) {
                failed++;
                String message = exception.getMessage() == null ? "Falha ao ler a grade pública." : exception.getMessage();
                jdbc.update("""
                        INSERT INTO public_grade_course_sync
                            (course_id, status, attempted_at, error_message)
                        VALUES (?, 'FAILED', ?, ?)
                        ON CONFLICT (course_id) DO UPDATE SET
                            status = 'FAILED', attempted_at = EXCLUDED.attempted_at,
                            error_message = EXCLUDED.error_message
                        """, courseId, java.sql.Timestamp.from(Instant.now()),
                        message.substring(0, Math.min(message.length(), 500)));
                LOG.warn("UFAM public grade import failed for course {}: {}", courseId, message);
            }
        }
        return new BatchResult(pending.size(), imported, failed);
    }

    private void refreshCourseDirectories() {
        for (int level : UNDERGRADUATE_LEVELS) {
            Boolean stale = jdbc.queryForObject("""
                    SELECT COALESCE(MAX(completed_at) FILTER (WHERE status = 'SUCCESS'),
                                    '-infinity'::timestamptz) < NOW() - INTERVAL '30 days'
                       AND COALESCE(MAX(started_at) FILTER (WHERE status = 'FAILED'),
                                    '-infinity'::timestamptz) < NOW() - INTERVAL '1 hour'
                    FROM external_sync_run
                    WHERE source = 'UFAM_ECAMPUS' AND resource = ?
                    """, Boolean.class, "courses:level:" + level);
            if (!Boolean.TRUE.equals(stale)) continue;
            try {
                courses.syncCourses(level);
            } catch (RuntimeException exception) {
                LOG.warn("UFAM course directory level {} unavailable: {}", level, exception.getMessage());
            }
        }
    }
}
