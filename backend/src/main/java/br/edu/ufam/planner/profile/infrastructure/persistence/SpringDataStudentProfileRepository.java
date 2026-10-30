package br.edu.ufam.planner.profile.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataStudentProfileRepository extends JpaRepository<StudentProfileJpaEntity, UUID> {

    Optional<StudentProfileJpaEntity> findByUserId(UUID userId);
}
