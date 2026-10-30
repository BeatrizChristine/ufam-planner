package br.edu.ufam.planner.integration.ufam.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface UfamCatalogStore {

    UUID startSync(String resource, Instant startedAt);

    void completeSync(UUID syncId, int itemsProcessed, Instant completedAt);

    void failSync(UUID syncId, String errorMessage, Instant completedAt);

    int saveCourses(List<UfamCourse> courses, String campus, int levelId, Instant syncedAt);

    CourseSource findCourseSource(UUID courseId);

    int saveCurriculumVersions(UUID courseId, List<UfamCurriculumVersion> versions, Instant syncedAt);

    UfamIntegrationStatus status(String baseUrl);

    record CourseSource(UUID id, String externalId, String code) {
    }
}
