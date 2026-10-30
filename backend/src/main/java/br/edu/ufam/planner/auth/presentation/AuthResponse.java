package br.edu.ufam.planner.auth.presentation;

import java.time.Instant;

import br.edu.ufam.planner.auth.application.AuthSession;
import br.edu.ufam.planner.auth.application.UserView;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt,
        UserView user) {

    static AuthResponse from(AuthSession session) {
        return new AuthResponse(
                session.accessToken(),
                "Bearer",
                session.accessTokenExpiresAt(),
                session.user());
    }

    @Override
    public String toString() {
        return "AuthResponse[accessToken=***, tokenType=" + tokenType + ", expiresAt=" + expiresAt + ", userId=" + user.id() + "]";
    }
}
