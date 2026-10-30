package br.edu.ufam.planner.auth.application;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationCodeStore {
    record Code(String hash, Instant sentAt, Instant expiresAt, int attempts) {}

    Optional<Code> findForUpdate(UUID userId);

    void save(UUID userId, String hash, Instant sentAt, Instant expiresAt);

    void incrementAttempts(UUID userId);

    void delete(UUID userId);
}
