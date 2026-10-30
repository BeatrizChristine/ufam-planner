package br.edu.ufam.planner.curriculum.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CurriculumMap(
        UUID id,
        String code,
        LocalDate effectiveFrom,
        String courseCode,
        String courseName,
        int totalWorkloadHours,
        Integer mandatoryWorkloadHours,
        Integer electiveWorkloadHours,
        Integer extensionWorkloadHours,
        int expectedPeriods,
        Source source,
        List<Component> components) {

    public record Source(
            String url,
            String title,
            String version,
            Instant publishedAt,
            Instant capturedAt,
            String trustStatus,
            boolean prerequisiteDataAvailable,
            String notes) {
    }

    public record Component(
            UUID componentId,
            UUID disciplineId,
            String code,
            String name,
            int workloadHours,
            Integer suggestedPeriod,
            String type,
            List<String> prerequisiteCodes,
            List<String> unlocksCodes) {
    }
}
