package br.edu.ufam.planner.auth.infrastructure;

import java.time.Instant;

import br.edu.ufam.planner.auth.application.AccessToken;
import br.edu.ufam.planner.auth.application.JwtTokenService;
import br.edu.ufam.planner.user.domain.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class NimbusJwtTokenService implements JwtTokenService {

    private final JwtEncoder encoder;
    private final long accessTokenMinutes;

    public NimbusJwtTokenService(
            JwtEncoder encoder,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes) {
        this.encoder = encoder;
        this.accessTokenMinutes = accessTokenMinutes;
    }

    @Override
    public AccessToken issue(UserAccount account) {
        var issuedAt = Instant.now();
        var expiresAt = issuedAt.plusSeconds(accessTokenMinutes * 60);
        var claims = JwtClaimsSet.builder()
                .issuer("ufam-planner")
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .subject(account.id().toString())
                .claim("username", account.username())
                .claim("email", account.email())
                .claim("role", account.role().name())
                .build();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        var token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AccessToken(token, expiresAt);
    }
}

