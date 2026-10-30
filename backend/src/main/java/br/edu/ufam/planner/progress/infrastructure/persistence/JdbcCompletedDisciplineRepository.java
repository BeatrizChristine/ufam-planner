package br.edu.ufam.planner.progress.infrastructure.persistence;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import br.edu.ufam.planner.progress.domain.CompletedDisciplineRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JdbcCompletedDisciplineRepository implements CompletedDisciplineRepository {

    private final JdbcClient jdbc;

    JdbcCompletedDisciplineRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Set<UUID> findCompletedIds(UUID profileId, UUID curriculumId) {
        return new HashSet<>(jdbc.sql("""
                SELECT progress.discipline_id
                  FROM academic_progress progress
                  JOIN curriculum_component component
                    ON component.discipline_id = progress.discipline_id
                 WHERE progress.student_profile_id = :profileId
                   AND component.curriculum_id = :curriculumId
                   AND progress.status = 'COMPLETED'
                   AND progress.source = 'ECAMPUS_HISTORY'
                """)
                .param("profileId", profileId)
                .param("curriculumId", curriculumId)
                .query(UUID.class)
                .list());
    }

    @Override
    public void setCompleted(UUID profileId, UUID disciplineId, boolean completed) {
        jdbc.sql("""
                INSERT INTO academic_progress
                    (id, student_profile_id, discipline_id, status, completed_at, source)
                VALUES (:id, :profileId, :disciplineId, :status,
                        CASE WHEN :completed THEN CURRENT_DATE ELSE NULL END, 'MANUAL')
                ON CONFLICT (student_profile_id, discipline_id)
                DO UPDATE SET status = EXCLUDED.status,
                              completed_at = EXCLUDED.completed_at,
                              final_grade = NULL,
                              source = 'MANUAL',
                              updated_at = NOW()
                WHERE academic_progress.source <> 'ECAMPUS_HISTORY'
                """)
                .param("id", UUID.randomUUID())
                .param("profileId", profileId)
                .param("disciplineId", disciplineId)
                .param("status", completed ? "COMPLETED" : "AVAILABLE")
                .param("completed", completed)
                .update();
    }

    @Override
    public void setCompletedFromHistory(UUID profileId, UUID disciplineId) {
        jdbc.sql("""
                INSERT INTO academic_progress
                    (id, student_profile_id, discipline_id, status, completed_at, source)
                VALUES (:id, :profileId, :disciplineId, 'COMPLETED', CURRENT_DATE, 'ECAMPUS_HISTORY')
                ON CONFLICT (student_profile_id, discipline_id)
                DO UPDATE SET status = 'COMPLETED', source = 'ECAMPUS_HISTORY',
                              completed_at = CURRENT_DATE, updated_at = NOW()
                """)
                .param("id", UUID.randomUUID())
                .param("profileId", profileId)
                .param("disciplineId", disciplineId)
                .update();
    }
}
