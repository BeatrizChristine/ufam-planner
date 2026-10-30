package br.edu.ufam.planner.profile.application;

import java.time.Instant;
import java.util.UUID;

public record AcademicProfileView(
        boolean completed,
        UUID id,
        UUID courseId,
        String courseCode,
        String courseName,
        UUID curriculumId,
        String curriculumCode,
        Integer admissionYear,
        Integer admissionTerm,
        String registrationNumber,
        Integer currentPeriod,
        Instant updatedAt) {

    public static AcademicProfileView incomplete() {
        return new AcademicProfileView(
                false, null, null, null, null, null, null,
                null, null, null, null, null);
    }
}
