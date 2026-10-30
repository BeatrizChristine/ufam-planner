package br.edu.ufam.planner.user.domain;

import java.time.Instant;
import java.util.UUID;

public record UserAccount(
        UUID id,
        String fullName,
        String username,
        String email,
        String passwordHash,
        UserRole role,
        UserStatus status,
        boolean emailVerified,
        String googleSubject,
        Instant createdAt,
        Instant updatedAt,
        Instant lastLoginAt) {

    public static UserAccount create(String fullName, String username, String email, String passwordHash) {
        var now = Instant.now();
        return new UserAccount(
                UUID.randomUUID(),
                fullName,
                username,
                email,
                passwordHash,
                UserRole.STUDENT,
                UserStatus.PENDING,
                false,
                null,
                now,
                now,
                null);
    }

    public UserAccount withLastLoginAt(Instant instant) {
        return new UserAccount(
                id, fullName, username, email, passwordHash, role, status,
                emailVerified, googleSubject, createdAt, instant, instant);
    }

    public UserAccount withPasswordHash(String encodedPassword) {
        return new UserAccount(id, fullName, username, email, encodedPassword, role, status,
                emailVerified, googleSubject, createdAt, Instant.now(), lastLoginAt);
    }

    public UserAccount withVerifiedEmail() {
        return new UserAccount(id, fullName, username, email, passwordHash, role,
                UserStatus.ACTIVE, true, googleSubject, createdAt, Instant.now(), lastLoginAt);
    }

    public static UserAccount createGoogle(String fullName, String username, String email, String googleSubject) {
        var now = Instant.now();
        return new UserAccount(UUID.randomUUID(), fullName, username, email, null,
                UserRole.STUDENT, UserStatus.ACTIVE, true, googleSubject, now, now, null);
    }
}

