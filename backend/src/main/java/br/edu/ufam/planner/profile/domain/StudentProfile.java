package br.edu.ufam.planner.profile.domain;

import java.time.Instant;
import java.util.UUID;

public record StudentProfile(
        UUID id,
        UUID userId,
        UUID courseId,
        UUID curriculumId,
        Integer admissionYear,
        Integer admissionTerm,
        String registrationNumber,
        Integer currentPeriod,
        Instant createdAt,
        Instant updatedAt) {

    public static StudentProfile create(
            UUID userId,
            UUID courseId,
            UUID curriculumId,
            Integer admissionYear,
            Integer admissionTerm,
            String registrationNumber,
            Integer currentPeriod) {
        var now = Instant.now();
        return new StudentProfile(
                UUID.randomUUID(), userId, courseId, curriculumId,
                admissionYear, admissionTerm, registrationNumber, currentPeriod, now, now);
    }

    public StudentProfile update(
            UUID nextCourseId,
            UUID nextCurriculumId,
            Integer nextAdmissionYear,
            Integer nextAdmissionTerm,
            String nextRegistrationNumber,
            Integer nextCurrentPeriod) {
        return new StudentProfile(
                id, userId, nextCourseId, nextCurriculumId,
                nextAdmissionYear, nextAdmissionTerm, nextRegistrationNumber,
                nextCurrentPeriod, createdAt, Instant.now());
    }
}
