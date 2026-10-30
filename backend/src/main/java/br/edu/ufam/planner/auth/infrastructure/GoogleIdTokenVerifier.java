package br.edu.ufam.planner.auth.infrastructure;

import br.edu.ufam.planner.auth.application.AuthException;
import br.edu.ufam.planner.auth.application.GoogleCredentialVerifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleIdTokenVerifier implements GoogleCredentialVerifier {
    private static final String GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
    private final String clientId;
    private final JwtDecoder decoder;

    @Autowired
    public GoogleIdTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this(clientId, NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS).build());
    }

    GoogleIdTokenVerifier(String clientId, JwtDecoder decoder) {
        this.clientId = clientId;
        this.decoder = decoder;
    }

    @Override
    public Identity verify(String credential) {
        if (clientId == null || clientId.isBlank())
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "google_login_unavailable",
                    "O acesso com Google ainda não foi configurado neste ambiente.");
        final Jwt token;
        try {
            token = decoder.decode(credential);
        } catch (JwtException | IllegalArgumentException exception) {
            throw invalid();
        }
        String issuer = token.getIssuer() == null ? null : token.getIssuer().toString();
        String subject = token.getSubject();
        String email = token.getClaimAsString("email");
        String authorizedParty = token.getClaimAsString("azp");
        if (!("accounts.google.com".equals(issuer) || "https://accounts.google.com".equals(issuer))
                || token.getAudience() == null || !token.getAudience().contains(clientId)
                || (authorizedParty != null && !clientId.equals(authorizedParty))
                || token.getExpiresAt() == null || !token.getExpiresAt().isAfter(java.time.Instant.now())
                || subject == null || subject.isBlank()
                || email == null || email.indexOf('@') < 1 || email.length() > 254
                || !Boolean.TRUE.equals(token.getClaim("email_verified")))
            throw invalid();
        String name = token.getClaimAsString("name");
        if (name == null || name.isBlank()) name = email.substring(0, email.indexOf('@'));
        name = name.strip();
        if (name.length() > 160) name = name.substring(0, 160);
        return new Identity(subject, email, name);
    }

    private static AuthException invalid() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "invalid_google_credential",
                "Não foi possível validar a conta Google. Tente novamente.");
    }
}
