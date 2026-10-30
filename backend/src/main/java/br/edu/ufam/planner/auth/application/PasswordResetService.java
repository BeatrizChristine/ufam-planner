package br.edu.ufam.planner.auth.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import br.edu.ufam.planner.user.domain.UserAccountRepository;
import br.edu.ufam.planner.user.domain.UserStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration VALID_FOR = Duration.ofMinutes(30);
    private static final Duration COOLDOWN = Duration.ofMinutes(2);

    private final UserAccountRepository users;
    private final PasswordResetTokenStore tokens;
    private final RefreshTokenStore refreshTokens;
    private final PasswordEncoder passwords;
    private final ObjectProvider<JavaMailSender> mailProvider;
    private final String frontendBaseUrl;
    private final String fromAddress;

    public PasswordResetService(UserAccountRepository users, PasswordResetTokenStore tokens,
            RefreshTokenStore refreshTokens, PasswordEncoder passwords,
            ObjectProvider<JavaMailSender> mailProvider,
            @Value("${app.frontend-base-url}") String frontendBaseUrl,
            @Value("${app.mail.from}") String fromAddress) {
        this.users = users;
        this.tokens = tokens;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.mailProvider = mailProvider;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
        this.fromAddress = fromAddress;
    }

    @Transactional
    public void request(String email) {
        var sender = mailProvider.getIfAvailable();
        if (sender == null) throw unavailable();
        var normalized = email.trim().toLowerCase(Locale.ROOT);
        var account = users.findByEmailOrUsername(normalized).orElse(null);
        if (account == null || account.status() != UserStatus.ACTIVE || account.passwordHash() == null) return;

        var now = Instant.now();
        if (tokens.recentlyRequested(account.id(), now.minus(COOLDOWN))) return;
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        var rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.invalidateForUser(account.id(), now);
        tokens.save(account.id(), hash(rawToken), now.plus(VALID_FOR));

        var message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(account.email());
        message.setSubject("Redefinir sua senha do UFAM Planner");
        message.setText("Recebemos um pedido para redefinir sua senha. Abra o link abaixo em até 30 minutos:\n\n"
                + frontendBaseUrl + "/redefinir-senha#token=" + rawToken
                + "\n\nSe você não fez este pedido, ignore este e-mail. Sua senha atual continua válida.");
        try {
            sender.send(message);
        } catch (MailException exception) {
            throw unavailable();
        }
    }

    @Transactional
    public void reset(String rawToken, String newPassword) {
        var now = Instant.now();
        var userId = tokens.consume(hash(rawToken), now)
                .orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST, "invalid_reset_link",
                        "Este link expirou ou já foi usado. Solicite outro."));
        var account = users.findById(userId)
                .orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST, "invalid_reset_link",
                        "Este link expirou ou já foi usado. Solicite outro."));
        users.save(account.withPasswordHash(passwords.encode(newPassword)));
        refreshTokens.revokeAllByUserId(userId, now);
    }

    private static String hash(String rawToken) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponível", exception);
        }
    }

    private static AuthException unavailable() {
        return new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "password_recovery_unavailable",
                "A recuperação por e-mail não está disponível neste ambiente. Tente novamente mais tarde.");
    }
}
