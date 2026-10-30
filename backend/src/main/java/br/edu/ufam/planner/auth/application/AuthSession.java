package br.edu.ufam.planner.auth.application;

import java.time.Instant;

public record AuthSession(
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        UserView user) {
}

