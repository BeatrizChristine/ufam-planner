package br.edu.ufam.planner.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import br.edu.ufam.planner.user.domain.UserAccount;
import br.edu.ufam.planner.user.domain.UserAccountRepository;
import br.edu.ufam.planner.user.domain.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    UserAccountRepository users;

    @Mock
    RefreshTokenStore refreshTokens;

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    JwtTokenService jwtTokenService;

    @Mock
    GoogleCredentialVerifier googleVerifier;

    @Mock
    EmailVerificationService emailVerification;

    AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, refreshTokens, passwordEncoder, jwtTokenService, googleVerifier,
                emailVerification, 7);
    }

    @Test
    void shouldRegisterAUniquePendingAccountAndSendCodeWithoutCreatingSession() {
        when(passwordEncoder.encode("strong-pass")).thenReturn("bcrypt-hash");
        when(users.saveAndFlush(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.register("Beatriz Christine", "Bia.Dev", "BIA@example.com", "strong-pass");

        var saved = org.mockito.ArgumentCaptor.forClass(UserAccount.class);
        verify(users).saveAndFlush(saved.capture());
        assertThat(saved.getValue().username()).isEqualTo("bia.dev");
        assertThat(saved.getValue().email()).isEqualTo("bia@example.com");
        assertThat(saved.getValue().status()).isEqualTo(UserStatus.PENDING);
        verify(emailVerification).send(saved.getValue());
        org.mockito.Mockito.verifyNoInteractions(refreshTokens, jwtTokenService);
    }

    @Test
    void verificationActivatesOnlyPendingAccount() {
        var account = UserAccount.create("Beatriz", "bia", "bia@example.com", "bcrypt-hash");
        when(users.findByEmailOrUsername("bia@example.com")).thenReturn(Optional.of(account));

        service.verifyEmail("BIA@example.com", "123456");

        verify(emailVerification).verify(account, "123456");
        var saved = org.mockito.ArgumentCaptor.forClass(UserAccount.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(saved.getValue().emailVerified()).isTrue();
    }

    @Test
    void pendingAccountCannotLogInBeforeVerification() {
        var account = UserAccount.create("Beatriz", "bia", "bia@example.com", "bcrypt-hash");
        when(users.findByEmailOrUsername("bia@example.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("correct-password", "bcrypt-hash")).thenReturn(true);

        assertThatThrownBy(() -> service.login("bia@example.com", "correct-password"))
                .isInstanceOfSatisfying(AuthException.class, exception ->
                        assertThat(exception.code()).isEqualTo("email_not_verified"));
    }

    @Test
    void existingActiveAccountWithoutVerificationRemainsAccessible() {
        var pending = UserAccount.create("Beatriz", "bia", "bia@example.com", "bcrypt-hash");
        var legacy = new UserAccount(pending.id(), pending.fullName(), pending.username(), pending.email(),
                pending.passwordHash(), pending.role(), UserStatus.ACTIVE, false, null,
                pending.createdAt(), pending.updatedAt(), null);
        when(users.findByEmailOrUsername("bia@example.com")).thenReturn(Optional.of(legacy));
        when(passwordEncoder.matches("correct-password", "bcrypt-hash")).thenReturn(true);
        when(users.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenService.issue(any(UserAccount.class)))
                .thenReturn(new AccessToken("access-token", Instant.now().plusSeconds(900)));

        assertThat(service.login("bia@example.com", "correct-password").accessToken()).isEqualTo("access-token");
    }

    @Test
    void shouldRejectAnEmailAlreadyInUse() {
        when(users.existsByEmail("bia@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register("Bia", "bia", "bia@example.com", "strong-pass"))
                .isInstanceOfSatisfying(AuthException.class, exception -> {
                    assertThat(exception.status()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.code()).isEqualTo("email_in_use");
                });
    }

    @Test
    void googleLoginCreatesAnAccountOnlyForAnUnregisteredVerifiedIdentity() {
        when(googleVerifier.verify("google-token"))
                .thenReturn(new GoogleCredentialVerifier.Identity("google-sub", "BIA@example.com", "Beatriz"));
        when(users.findByGoogleSubject("google-sub")).thenReturn(Optional.empty());
        when(users.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenService.issue(any(UserAccount.class)))
                .thenReturn(new AccessToken("access-token", Instant.now().plusSeconds(900)));

        var session = service.googleLogin("google-token");

        assertThat(session.user().email()).isEqualTo("bia@example.com");
        assertThat(session.user().username()).isEqualTo("bia");
        assertThat(session.accessToken()).isEqualTo("access-token");
        verify(refreshTokens).save(eq(session.user().id()), any(String.class), any(Instant.class));
    }

    @Test
    void googleLoginDoesNotSilentlyTakeOverAnExistingPasswordAccount() {
        when(googleVerifier.verify("google-token"))
                .thenReturn(new GoogleCredentialVerifier.Identity("new-sub", "bia@example.com", "Beatriz"));
        when(users.findByGoogleSubject("new-sub")).thenReturn(Optional.empty());
        when(users.existsByEmail("bia@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.googleLogin("google-token"))
                .isInstanceOfSatisfying(AuthException.class, exception -> {
                    assertThat(exception.status()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.code()).isEqualTo("google_email_already_registered");
                });
    }
}

