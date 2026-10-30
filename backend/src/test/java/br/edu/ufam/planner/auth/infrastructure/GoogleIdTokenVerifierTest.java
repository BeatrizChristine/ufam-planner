package br.edu.ufam.planner.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.Instant;

import br.edu.ufam.planner.auth.application.AuthException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

@ExtendWith(MockitoExtension.class)
class GoogleIdTokenVerifierTest {
    @Mock JwtDecoder decoder;

    @Test
    void acceptsAValidGoogleIdentityForOurClient() {
        when(decoder.decode("credential")).thenReturn(jwt("our-client", true));

        var identity = new GoogleIdTokenVerifier("our-client", decoder).verify("credential");

        assertThat(identity.subject()).isEqualTo("stable-google-id");
        assertThat(identity.email()).isEqualTo("student@gmail.com");
    }

    @Test
    void rejectsTokensIssuedToAnotherApplication() {
        when(decoder.decode("credential")).thenReturn(jwt("other-client", true));
        assertThatThrownBy(() -> new GoogleIdTokenVerifier("our-client", decoder).verify("credential"))
                .isInstanceOf(AuthException.class);
    }

    @Test
    void rejectsUnverifiedEmail() {
        when(decoder.decode("credential")).thenReturn(jwt("our-client", false));
        assertThatThrownBy(() -> new GoogleIdTokenVerifier("our-client", decoder).verify("credential"))
                .isInstanceOf(AuthException.class);
    }

    private static Jwt jwt(String audience, boolean emailVerified) {
        return Jwt.withTokenValue("credential")
                .header("alg", "RS256")
                .issuer("https://accounts.google.com")
                .subject("stable-google-id")
                .audience(java.util.List.of(audience))
                .issuedAt(Instant.now().minusSeconds(5))
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("email", "student@gmail.com")
                .claim("email_verified", emailVerified)
                .claim("name", "Student")
                .build();
    }
}
