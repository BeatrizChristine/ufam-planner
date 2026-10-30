package br.edu.ufam.planner.user.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;

import br.edu.ufam.planner.user.domain.UserRole;
import br.edu.ufam.planner.user.domain.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_user")
class UserJpaEntity {

    @Id
    UUID id;

    @Column(name = "full_name", nullable = false, length = 160)
    String fullName;

    @Column(nullable = false, length = 30)
    String username;

    @Column(nullable = false, length = 254)
    String email;

    @Column(name = "password_hash")
    String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    UserStatus status;

    @Column(name = "email_verified", nullable = false)
    boolean emailVerified;

    @Column(name = "google_subject")
    String googleSubject;

    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    @Column(name = "last_login_at")
    Instant lastLoginAt;

    protected UserJpaEntity() {
    }
}

