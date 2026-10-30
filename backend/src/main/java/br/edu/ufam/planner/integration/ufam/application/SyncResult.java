package br.edu.ufam.planner.integration.ufam.application;

import java.time.Instant;

public record SyncResult(
        String resource,
        int itemsProcessed,
        Instant completedAt) {
}
