package br.edu.ufam.planner.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import br.edu.ufam.planner.user.domain.UserAccount;
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
class EmailVerificationServiceTest {
    @Mock EmailVerificationCodeStore codes;
    @Mock PasswordEncoder passwords;
    @Mock ObjectProvider<JavaMailSender> mailProvider;
    @Mock JavaMailSender sender;

    private final UserAccount account = UserAccount.create("Beatriz", "bia", "bia@example.test", "hash");

    @Test
    void sendsSixDigitCodeAndStoresOnlyEncodedVersion() {
        when(mailProvider.getIfAvailable()).thenReturn(sender);
        when(passwords.encode(any(String.class))).thenReturn("encoded-code");

        service().send(account);

        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertThat(message.getValue().getText()).containsPattern("[0-9]{6}");
        assertThat(message.getValue().getText()).doesNotContain("encoded-code");
        verify(codes).save(org.mockito.ArgumentMatchers.eq(account.id()),
                org.mockito.ArgumentMatchers.eq("encoded-code"), any(Instant.class), any(Instant.class));
    }

    @Test
    void doesNotResendWithinOneMinute() {
        when(mailProvider.getIfAvailable()).thenReturn(sender);
        when(codes.findForUpdate(account.id())).thenReturn(Optional.of(
                new EmailVerificationCodeStore.Code("encoded", Instant.now(), Instant.now().plusSeconds(600), 0)));

        service().send(account);

        verify(sender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void wrongCodeConsumesAnAttempt() {
        when(codes.findForUpdate(account.id())).thenReturn(Optional.of(
                new EmailVerificationCodeStore.Code("encoded", Instant.now(), Instant.now().plusSeconds(600), 0)));

        assertThatThrownBy(() -> service().verify(account, "000000"))
                .isInstanceOf(AuthException.class);
        verify(codes).incrementAttempts(account.id());
    }

    @Test
    void correctCodeIsDeletedAfterUse() {
        when(codes.findForUpdate(account.id())).thenReturn(Optional.of(
                new EmailVerificationCodeStore.Code("encoded", Instant.now(), Instant.now().plusSeconds(600), 0)));
        when(passwords.matches("123456", "encoded")).thenReturn(true);

        service().verify(account, "123456");

        verify(codes).delete(account.id());
    }

    private EmailVerificationService service() {
        return new EmailVerificationService(codes, passwords, mailProvider, "nao-responda@example.test");
    }
}
