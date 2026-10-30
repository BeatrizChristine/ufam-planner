package br.edu.ufam.planner.progress.application;

import java.util.UUID;

public record DashboardSummary(
        boolean profileCompleted,
        String studentName,
        UUID courseId,
        String courseCode,
        String courseName,
        UUID curriculumId,
        String curriculumCode,
        Integer admissionYear,
        Integer admissionTerm,
        Integer currentPeriod,
        boolean progressAvailable) {
}
