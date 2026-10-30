package br.edu.ufam.planner.course.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataCurriculumRepository extends JpaRepository<CurriculumJpaEntity, UUID> {

    List<CurriculumJpaEntity> findAllByCourseIdAndActiveTrueOrderByEffectiveFromDesc(UUID courseId);

    Optional<CurriculumJpaEntity> findByIdAndActiveTrue(UUID id);
}
