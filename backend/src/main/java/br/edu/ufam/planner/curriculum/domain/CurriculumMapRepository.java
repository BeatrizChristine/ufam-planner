package br.edu.ufam.planner.curriculum.domain;

import java.util.Optional;
import java.util.UUID;

public interface CurriculumMapRepository {

    Optional<CurriculumMap> findById(UUID curriculumId);
}
