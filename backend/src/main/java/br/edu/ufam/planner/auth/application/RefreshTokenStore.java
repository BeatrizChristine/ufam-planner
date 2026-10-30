package br.edu.ufam.planner.auth.application;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenStore {

    void save(UUID userId, String tokenHash, Instant expiresAt);

    Optional<StoredRefreshToken> findActiveByHash(String tokenHash);

    void revoke(UUID id, Instant revokedAt);
    void revokeAllByUserId(UUID userId, Instant revokedAt);
}

