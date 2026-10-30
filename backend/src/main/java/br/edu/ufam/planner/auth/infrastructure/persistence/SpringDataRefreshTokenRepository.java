package br.edu.ufam.planner.auth.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataRefreshTokenRepository extends JpaRepository<RefreshTokenJpaEntity, UUID> {

    Optional<RefreshTokenJpaEntity> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    java.util.List<RefreshTokenJpaEntity> findAllByUserIdAndRevokedAtIsNull(UUID userId);
}

