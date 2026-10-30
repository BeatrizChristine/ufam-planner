package br.edu.ufam.planner.auth.application;

import java.time.Instant;
import java.util.UUID;

public record StoredRefreshToken(
        UUID id,
        UUID userId,
        String tokenHash,
        Instant expiresAt,
        Instant revokedAt,
        Instant createdAt) {

    public boolean isUsableAt(Instant instant) {
        return revokedAt == null && expiresAt.isAfter(instant);
    }
}

