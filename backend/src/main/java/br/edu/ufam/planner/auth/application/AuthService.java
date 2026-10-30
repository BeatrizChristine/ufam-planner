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
import java.util.UUID;

import br.edu.ufam.planner.user.domain.UserAccount;
import br.edu.ufam.planner.user.domain.UserAccountRepository;
import br.edu.ufam.planner.user.domain.UserStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserAccountRepository users;
    private final RefreshTokenStore refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final GoogleCredentialVerifier googleVerifier;
    private final EmailVerificationService emailVerification;
    private final Duration refreshLifetime;

    public AuthService(
            UserAccountRepository users,
            RefreshTokenStore refreshTokens,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            GoogleCredentialVerifier googleVerifier,
            EmailVerificationService emailVerification,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.googleVerifier = googleVerifier;
        this.emailVerification = emailVerification;
        this.refreshLifetime = Duration.ofDays(refreshTokenDays);
    }

    @Transactional
    public void register(String fullName, String username, String email, String password) {
        var normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        var normalizedEmail = email.trim().toLowerCase(Locale.ROOT);

        if (users.existsByEmail(normalizedEmail)) {
            throw new AuthException(HttpStatus.CONFLICT, "email_in_use", "Este e-mail já está cadastrado.");
        }
        if (users.existsByUsername(normalizedUsername)) {
            throw new AuthException(HttpStatus.CONFLICT, "username_in_use", "Este username já está sendo usado.");
        }

        var account = UserAccount.create(
                fullName.trim(),
                normalizedUsername,
                normalizedEmail,
                passwordEncoder.encode(password));

        // The verification code has a foreign key to this account and uses JDBC.
        // Flush the JPA insert before writing that code in the same transaction.
        emailVerification.send(users.saveAndFlush(account));
    }

    @Transactional(noRollbackFor = AuthException.class)
    public void verifyEmail(String email, String code) {
        var account = users.findByEmailOrUsername(email.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.status() == UserStatus.PENDING && !user.emailVerified())
                .orElseThrow(AuthService::invalidVerificationCode);
        emailVerification.verify(account, code);
        users.save(account.withVerifiedEmail());
    }

    @Transactional
    public void resendVerification(String email) {
        users.findByEmailOrUsername(email.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.status() == UserStatus.PENDING && !user.emailVerified())
                .ifPresent(emailVerification::send);
    }

    @Transactional
    public AuthSession login(String identifier, String password) {
        var normalizedIdentifier = identifier.trim().toLowerCase(Locale.ROOT);
        if (normalizedIdentifier.startsWith("@")) {
            normalizedIdentifier = normalizedIdentifier.substring(1);
        }
        var account = users.findByEmailOrUsername(normalizedIdentifier)
                .orElseThrow(AuthService::invalidCredentials);

        if (account.passwordHash() == null || !passwordEncoder.matches(password, account.passwordHash())) {
            throw invalidCredentials();
        }
        if (account.status() == UserStatus.PENDING && !account.emailVerified()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "email_not_verified",
                    "Confirme o código enviado ao seu e-mail antes de entrar.");
        }
        if (account.status() != UserStatus.ACTIVE) throw invalidCredentials();

        var updatedAccount = users.save(account.withLastLoginAt(Instant.now()));
        return createSession(updatedAccount);
    }

    @Transactional
    public AuthSession googleLogin(String credential) {
        var identity = googleVerifier.verify(credential);
        var account = users.findByGoogleSubject(identity.subject()).orElse(null);
        if (account == null) {
            String email = identity.email().trim().toLowerCase(Locale.ROOT);
            if (users.existsByEmail(email))
                throw new AuthException(HttpStatus.CONFLICT, "google_email_already_registered",
                        "Este e-mail já possui uma conta. Entre com sua senha; a vinculação com Google ainda não está disponível.");
            String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-z0-9._]", "_");
            if (base.length() < 3) base = "google";
            if (base.length() > 24) base = base.substring(0, 24);
            String username = base;
            while (users.existsByUsername(username))
                username = base + "_" + UUID.randomUUID().toString().substring(0, 5);
            account = users.save(UserAccount.createGoogle(identity.name(), username, email, identity.subject()));
        }
        if (account.status() != UserStatus.ACTIVE)
            throw invalidCredentials();
        return createSession(users.save(account.withLastLoginAt(Instant.now())));
    }

    @Transactional
    public AuthSession refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw invalidRefreshToken();
        }

        var now = Instant.now();
        var stored = refreshTokens.findActiveByHash(hash(rawRefreshToken))
                .orElseThrow(AuthService::invalidRefreshToken);

        if (!stored.isUsableAt(now)) {
            refreshTokens.revoke(stored.id(), now);
            throw invalidRefreshToken();
        }

        var account = users.findById(stored.userId())
                .filter(user -> user.status() == UserStatus.ACTIVE)
                .orElseThrow(AuthService::invalidRefreshToken);

        refreshTokens.revoke(stored.id(), now);
        return createSession(account);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokens.findActiveByHash(hash(rawRefreshToken))
                .ifPresent(token -> refreshTokens.revoke(token.id(), Instant.now()));
    }

    @Transactional(readOnly = true)
    public UserView getUser(UUID id) {
        return users.findById(id)
                .map(UserView::from)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "user_not_found", "Usuário não encontrado."));
    }

    private AuthSession createSession(UserAccount account) {
        var accessToken = jwtTokenService.issue(account);
        var rawRefreshToken = newRefreshToken();
        refreshTokens.save(account.id(), hash(rawRefreshToken), Instant.now().plus(refreshLifetime));
        return new AuthSession(accessToken.value(), accessToken.expiresAt(), rawRefreshToken, UserView.from(account));
    }

    private static String newRefreshToken() {
        var bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "invalid_credentials", "E-mail, username ou senha inválidos.");
    }

    private static AuthException invalidVerificationCode() {
        return new AuthException(HttpStatus.BAD_REQUEST, "invalid_verification_code",
                "Código inválido ou expirado. Confira o e-mail ou solicite outro.");
    }

    private static AuthException invalidRefreshToken() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "invalid_refresh_token", "Sua sessão expirou. Entre novamente.");
    }
}
