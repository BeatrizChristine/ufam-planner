package br.edu.ufam.planner.auth.application;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenStore {
    boolean recentlyRequested(UUID userId, Instant since);
    void invalidateForUser(UUID userId, Instant when);
    void save(UUID userId, String tokenHash, Instant expiresAt);
    Optional<UUID> consume(String tokenHash, Instant when);
}
