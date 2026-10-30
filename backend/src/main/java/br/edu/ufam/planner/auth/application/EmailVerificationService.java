package br.edu.ufam.planner.auth.application;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

import br.edu.ufam.planner.user.domain.UserAccount;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class EmailVerificationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration VALID_FOR = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;

    private final EmailVerificationCodeStore codes;
    private final PasswordEncoder passwords;
    private final ObjectProvider<JavaMailSender> mailProvider;
    private final String fromAddress;

    public EmailVerificationService(EmailVerificationCodeStore codes, PasswordEncoder passwords,
            ObjectProvider<JavaMailSender> mailProvider, @Value("${app.mail.from}") String fromAddress) {
        this.codes = codes;
        this.passwords = passwords;
        this.mailProvider = mailProvider;
        this.fromAddress = fromAddress;
    }

    public void send(UserAccount account) {
        var sender = mailProvider.getIfAvailable();
        if (sender == null) throw unavailable();
        var now = Instant.now();
        if (codes.findForUpdate(account.id())
                .filter(existing -> existing.sentAt().plus(RESEND_COOLDOWN).isAfter(now)).isPresent()) return;

        var code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        codes.save(account.id(), passwords.encode(code), now, now.plus(VALID_FOR));
        var message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(account.email());
        message.setSubject("Confirme seu e-mail no UFAM Planner");
        message.setText("Seu código de confirmação é: " + code
                + "\n\nEle vale por 10 minutos e pode ser usado uma vez."
                + "\n\nSe você não criou uma conta no UFAM Planner, ignore esta mensagem.");
        try {
            sender.send(message);
        } catch (MailException exception) {
            throw unavailable();
        }
    }

    public void verify(UserAccount account, String value) {
        var stored = codes.findForUpdate(account.id()).orElseThrow(EmailVerificationService::invalid);
        if (!stored.expiresAt().isAfter(Instant.now()) || stored.attempts() >= MAX_ATTEMPTS) throw invalid();
        if (!passwords.matches(value, stored.hash())) {
            codes.incrementAttempts(account.id());
            throw invalid();
        }
        codes.delete(account.id());
    }

    private static AuthException invalid() {
        return new AuthException(HttpStatus.BAD_REQUEST, "invalid_verification_code",
                "Código inválido ou expirado. Confira o e-mail ou solicite outro.");
    }

    private static AuthException unavailable() {
        return new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "email_verification_unavailable",
                "Não foi possível enviar o código agora. Tente novamente mais tarde.");
    }
}
