package br.edu.ufam.planner.course.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataCourseRepository extends JpaRepository<CourseJpaEntity, UUID> {

    List<CourseJpaEntity> findAllByActiveTrueOrderByNameAsc();

    Optional<CourseJpaEntity> findByIdAndActiveTrue(UUID id);
}
