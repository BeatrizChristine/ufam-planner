package br.edu.ufam.planner.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.user.domain.UserAccount;
import br.edu.ufam.planner.user.domain.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {
    @Mock UserAccountRepository users;
    @Mock PasswordResetTokenStore tokens;
    @Mock RefreshTokenStore refreshTokens;
    @Mock PasswordEncoder passwords;
    @Mock ObjectProvider<JavaMailSender> mailProvider;
    @Mock JavaMailSender sender;

    @Test
    void unknownEmailGetsTheSamePublicSuccessWithoutSendingMail() {
        when(mailProvider.getIfAvailable()).thenReturn(sender);

        service().request("unknown@example.test");

        verify(sender, never()).send(any(SimpleMailMessage.class));
        verify(tokens, never()).save(any(), any(), any());
    }

    @Test
    void requestSendsAOneTimeLinkButStoresOnlyItsHash() {
        var account = UserAccount.create("Estudante", "estudante", "test@example.test", "bcrypt-hash")
                .withVerifiedEmail();
        when(mailProvider.getIfAvailable()).thenReturn(sender);
        when(users.findByEmailOrUsername("test@example.test")).thenReturn(Optional.of(account));

        service().request("TEST@example.test");

        var email = ArgumentCaptor.forClass(SimpleMailMessage.class);
        var hash = ArgumentCaptor.forClass(String.class);
        verify(sender).send(email.capture());
        verify(tokens).save(eq(account.id()), hash.capture(), any(Instant.class));
        assertThat(email.getValue().getText()).contains("/redefinir-senha#token=");
        assertThat(hash.getValue()).hasSize(64).doesNotContain("/", "=");
        assertThat(email.getValue().getText()).doesNotContain(hash.getValue());
    }

    @Test
    void resetChangesPasswordAndRevokesRefreshSessions() {
        UUID id = UUID.randomUUID();
        var account = UserAccount.create("Estudante", "estudante", "test@example.test", "old-hash");
        when(tokens.consume(any(String.class), any(Instant.class))).thenReturn(Optional.of(id));
        when(users.findById(id)).thenReturn(Optional.of(account));
        when(passwords.encode("new-strong-password")).thenReturn("new-hash");

        service().reset("a-valid-looking-one-time-token", "new-strong-password");

        var updated = ArgumentCaptor.forClass(UserAccount.class);
        verify(users).save(updated.capture());
        assertThat(updated.getValue().passwordHash()).isEqualTo("new-hash");
        verify(refreshTokens).revokeAllByUserId(eq(id), any(Instant.class));
    }

    private PasswordResetService service() {
        return new PasswordResetService(users, tokens, refreshTokens, passwords, mailProvider,
                "http://localhost:3000", "no-reply@example.test");
    }
}
