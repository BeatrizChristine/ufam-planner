package br.edu.ufam.planner.auth.infrastructure.persistence;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.auth.application.PasswordResetTokenStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcPasswordResetTokenStore implements PasswordResetTokenStore {
    private final JdbcTemplate jdbc;

    public JdbcPasswordResetTokenStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean recentlyRequested(UUID userId, Instant since) {
        Integer count = jdbc.queryForObject("""
                SELECT count(*) FROM password_reset_token
                WHERE user_id = ? AND created_at >= ? AND consumed_at IS NULL
                """, Integer.class, userId, Timestamp.from(since));
        return count != null && count > 0;
    }

    @Override
    public void invalidateForUser(UUID userId, Instant when) {
        jdbc.update("UPDATE password_reset_token SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
                Timestamp.from(when), userId);
    }

    @Override
    public void save(UUID userId, String tokenHash, Instant expiresAt) {
        jdbc.update("INSERT INTO password_reset_token (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                tokenHash, userId, Timestamp.from(expiresAt));
    }

    @Override
    public Optional<UUID> consume(String tokenHash, Instant when) {
        return jdbc.query("""
                UPDATE password_reset_token SET consumed_at = ?
                WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?
                RETURNING user_id
                """, (rs, row) -> (UUID) rs.getObject("user_id"),
                Timestamp.from(when), tokenHash, Timestamp.from(when)).stream().findFirst();
    }
}
