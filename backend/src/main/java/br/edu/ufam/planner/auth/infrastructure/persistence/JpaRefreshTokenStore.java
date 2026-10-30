package br.edu.ufam.planner.auth.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.auth.application.RefreshTokenStore;
import br.edu.ufam.planner.auth.application.StoredRefreshToken;
import org.springframework.stereotype.Repository;

@Repository
public class JpaRefreshTokenStore implements RefreshTokenStore {

    private final SpringDataRefreshTokenRepository repository;

    public JpaRefreshTokenStore(SpringDataRefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Override
    public void save(UUID userId, String tokenHash, Instant expiresAt) {
        var entity = new RefreshTokenJpaEntity();
        entity.id = UUID.randomUUID();
        entity.userId = userId;
        entity.tokenHash = tokenHash;
        entity.expiresAt = expiresAt;
        entity.createdAt = Instant.now();
        repository.save(entity);
    }

    @Override
    public Optional<StoredRefreshToken> findActiveByHash(String tokenHash) {
        return repository.findByTokenHashAndRevokedAtIsNull(tokenHash).map(JpaRefreshTokenStore::toRecord);
    }

    @Override
    public void revoke(UUID id, Instant revokedAt) {
        repository.findById(id).ifPresent(entity -> {
            entity.revokedAt = revokedAt;
            repository.save(entity);
        });
    }

    @Override
    public void revokeAllByUserId(UUID userId, Instant revokedAt) {
        var tokens = repository.findAllByUserIdAndRevokedAtIsNull(userId);
        tokens.forEach(token -> token.revokedAt = revokedAt);
        repository.saveAll(tokens);
    }

    private static StoredRefreshToken toRecord(RefreshTokenJpaEntity entity) {
        return new StoredRefreshToken(
                entity.id,
                entity.userId,
                entity.tokenHash,
                entity.expiresAt,
                entity.revokedAt,
                entity.createdAt);
    }
}

