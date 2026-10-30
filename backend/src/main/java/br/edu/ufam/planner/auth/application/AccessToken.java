package br.edu.ufam.planner.auth.application;

import java.time.Instant;

public record AccessToken(String value, Instant expiresAt) {
}

