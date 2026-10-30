package br.edu.ufam.planner.course.domain;

import java.time.LocalDate;
import java.util.UUID;

public record CurriculumCatalogItem(
        UUID id,
        UUID courseId,
        String code,
        LocalDate effectiveFrom,
        int totalWorkloadHours,
        int expectedPeriods) {
}
