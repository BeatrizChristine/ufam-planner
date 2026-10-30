package br.edu.ufam.planner.integration.ufam.application;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class UfamCatalogSyncService {

    private static final Map<Integer, String> CAMPUSES = Map.ofEntries(
            Map.entry(3, "Manaus"),
            Map.entry(13, "Educação a Distância"),
            Map.entry(14, "Coari"),
            Map.entry(15, "Humaitá"),
            Map.entry(16, "Benjamin Constant"),
            Map.entry(17, "Itacoatiara"),
            Map.entry(18, "Parintins"),
            Map.entry(20, "PARFOR"),
            Map.entry(22, "Graduação Indígena"));

    private final UfamAcademicCatalogClient client;
    private final UfamCatalogStore store;
    private final Clock clock;
    private final String baseUrl;

    @Autowired
    public UfamCatalogSyncService(
            UfamAcademicCatalogClient client,
            UfamCatalogStore store,
            @Value("${app.integrations.ufam.ecampus-base-url}") String baseUrl) {
        this(client, store, Clock.systemUTC(), baseUrl);
    }

    UfamCatalogSyncService(
            UfamAcademicCatalogClient client,
            UfamCatalogStore store,
            Clock clock,
            String baseUrl) {
        this.client = client;
        this.store = store;
        this.clock = clock;
        this.baseUrl = baseUrl;
    }

    public SyncResult syncCourses(int levelId) {
        var campus = CAMPUSES.get(levelId);
        if (campus == null) {
            throw new UfamIntegrationException(
                    "unsupported_course_level",
                    "O nível informado não faz parte dos níveis de graduação configurados.");
        }

        var resource = "courses:level:" + levelId;
        var syncId = store.startSync(resource, clock.instant());
        try {
            var courses = client.fetchCourses(levelId);
            var completedAt = clock.instant();
            var processed = store.saveCourses(courses, campus, levelId, completedAt);
            store.completeSync(syncId, processed, completedAt);
            return new SyncResult(resource, processed, completedAt);
        } catch (RuntimeException exception) {
            store.failSync(syncId, safeMessage(exception), clock.instant());
            throw exception;
        }
    }

    public SyncResult syncCurriculumVersions(UUID courseId) {
        var course = store.findCourseSource(courseId);
        if (course.externalId() == null || course.externalId().isBlank()) {
            throw new UfamIntegrationException(
                    "course_without_ufam_source",
                    "Este curso ainda não está vinculado ao catálogo público da UFAM.");
        }

        var resource = "curricula:course:" + course.code();
        var syncId = store.startSync(resource, clock.instant());
        try {
            var versions = client.fetchCurriculumVersions(course.externalId());
            var completedAt = clock.instant();
            var processed = store.saveCurriculumVersions(course.id(), versions, completedAt);
            store.completeSync(syncId, processed, completedAt);
            return new SyncResult(resource, processed, completedAt);
        } catch (RuntimeException exception) {
            store.failSync(syncId, safeMessage(exception), clock.instant());
            throw exception;
        }
    }

    public UfamIntegrationStatus status() {
        return store.status(baseUrl);
    }

    private static String safeMessage(RuntimeException exception) {
        var message = exception.getMessage();
        return message == null ? "Falha não detalhada na integração com a UFAM." : message.substring(0, Math.min(message.length(), 500));
    }
}
