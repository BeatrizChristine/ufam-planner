package br.edu.ufam.planner.auth.infrastructure.persistence;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.auth.application.EmailVerificationCodeStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcEmailVerificationCodeStore implements EmailVerificationCodeStore {
    private final JdbcTemplate jdbc;

    public JdbcEmailVerificationCodeStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Code> findForUpdate(UUID userId) {
        return jdbc.query("""
                SELECT code_hash, sent_at, expires_at, attempts
                FROM email_verification_code WHERE user_id = ? FOR UPDATE
                """, (rs, row) -> new Code(rs.getString("code_hash"),
                rs.getTimestamp("sent_at").toInstant(), rs.getTimestamp("expires_at").toInstant(),
                rs.getInt("attempts")), userId).stream().findFirst();
    }

    @Override
    public void save(UUID userId, String hash, Instant sentAt, Instant expiresAt) {
        jdbc.update("""
                INSERT INTO email_verification_code (user_id, code_hash, sent_at, expires_at, attempts)
                VALUES (?, ?, ?, ?, 0)
                ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash,
                    sent_at = EXCLUDED.sent_at, expires_at = EXCLUDED.expires_at, attempts = 0
                """, userId, hash, Timestamp.from(sentAt), Timestamp.from(expiresAt));
    }

    @Override
    public void incrementAttempts(UUID userId) {
        jdbc.update("UPDATE email_verification_code SET attempts = attempts + 1 WHERE user_id = ?", userId);
    }

    @Override
    public void delete(UUID userId) {
        jdbc.update("DELETE FROM email_verification_code WHERE user_id = ?", userId);
    }
}
