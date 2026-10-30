package br.edu.ufam.planner.progress.domain;

import java.util.Set;
import java.util.UUID;

public interface CompletedDisciplineRepository {

    Set<UUID> findCompletedIds(UUID profileId, UUID curriculumId);

    void setCompleted(UUID profileId, UUID disciplineId, boolean completed);

    void setCompletedFromHistory(UUID profileId, UUID disciplineId);
}
