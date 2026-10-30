package br.edu.ufam.planner.integration.ufam.application;

import java.time.Instant;

public record UfamIntegrationStatus(
        String source,
        String baseUrl,
        String lastStatus,
        String lastResource,
        Integer lastItemsProcessed,
        Instant lastSyncAt,
        long importedCourses,
        long discoveredCurriculumVersions) {
}
