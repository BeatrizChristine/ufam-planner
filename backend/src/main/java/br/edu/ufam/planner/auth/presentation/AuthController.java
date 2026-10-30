package br.edu.ufam.planner.auth.presentation;

import java.time.Duration;

import br.edu.ufam.planner.auth.application.AuthService;
import br.edu.ufam.planner.auth.application.AuthSession;
import br.edu.ufam.planner.auth.application.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "ufam_refresh";

    private final AuthService authService;
    private final PasswordResetService passwordReset;
    private final Duration refreshLifetime;
    private final boolean secureCookie;

    public AuthController(
            AuthService authService,
            PasswordResetService passwordReset,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays,
            @Value("${app.jwt.refresh-cookie-secure}") boolean secureCookie) {
        this.authService = authService;
        this.passwordReset = passwordReset;
        this.refreshLifetime = Duration.ofDays(refreshTokenDays);
        this.secureCookie = secureCookie;
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request.name(), request.username(), request.email(), request.password());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email/verify")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.email(), request.code());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email/resend")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        var session = authService.login(request.identifier(), request.password());
        return withRefreshCookie(session, HttpStatus.OK);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest request) {
        return withRefreshCookie(authService.googleLogin(request.credential()), HttpStatus.OK);
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordReset.request(request.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordReset.reset(request.token(), request.password());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return withRefreshCookie(authService.refresh(refreshToken), HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        var expiredCookie = createCookie("", Duration.ZERO);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthSession session, HttpStatus status) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, createCookie(session.refreshToken(), refreshLifetime).toString())
                .body(AuthResponse.from(session));
    }

    private ResponseCookie createCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
    }
}
