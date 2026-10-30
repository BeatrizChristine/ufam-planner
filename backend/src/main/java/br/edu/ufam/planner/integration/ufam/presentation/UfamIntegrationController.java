package br.edu.ufam.planner.integration.ufam.presentation;

import java.util.UUID;

import br.edu.ufam.planner.integration.ufam.application.SyncResult;
import br.edu.ufam.planner.integration.ufam.application.UfamCatalogSyncService;
import br.edu.ufam.planner.integration.ufam.application.UfamGradeCatalogSyncService;
import br.edu.ufam.planner.integration.ufam.application.UfamIntegrationStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/integrations/ufam")
public class UfamIntegrationController {

    private final UfamCatalogSyncService syncService;
    private final UfamGradeCatalogSyncService gradeSync;

    public UfamIntegrationController(UfamCatalogSyncService syncService, UfamGradeCatalogSyncService gradeSync) {
        this.syncService = syncService;
        this.gradeSync = gradeSync;
    }

    @GetMapping("/status")
    public UfamIntegrationStatus status() {
        return syncService.status();
    }

    @PostMapping("/sync/courses")
    @PreAuthorize("hasRole('ADMIN')")
    public SyncResult syncCourses(
            @RequestParam(defaultValue = "3") @Min(1) @Max(99) int levelId) {
        return syncService.syncCourses(levelId);
    }

    @PostMapping("/sync/courses/{courseId}/curricula")
    @PreAuthorize("hasRole('ADMIN')")
    public SyncResult syncCurricula(@PathVariable UUID courseId) {
        return syncService.syncCurriculumVersions(courseId);
    }

    @PostMapping("/sync/disciplines")
    @PreAuthorize("hasRole('ADMIN')")
    public UfamGradeCatalogSyncService.BatchResult syncDisciplines(
            @RequestParam(defaultValue = "3") @Min(1) @Max(10) int limit) {
        return gradeSync.syncNextBatch(limit);
    }
}
