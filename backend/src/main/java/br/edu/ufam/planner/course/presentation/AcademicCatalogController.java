package br.edu.ufam.planner.course.presentation;

import java.util.List;
import java.util.UUID;

import br.edu.ufam.planner.course.application.AcademicCatalogService;
import br.edu.ufam.planner.course.domain.CurriculumCatalogItem;
import br.edu.ufam.planner.integration.ufam.application.UfamUndergraduateDirectory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
public class AcademicCatalogController {

    private final AcademicCatalogService catalogService;
    private final UfamUndergraduateDirectory directory;

    public AcademicCatalogController(AcademicCatalogService catalogService, UfamUndergraduateDirectory directory) {
        this.catalogService = catalogService;
        this.directory = directory;
    }

    public record CourseView(UUID id, String code, String name, String campus, String degreeType,
            String unitName, String unitAbbreviation, String studyShift, String officialUrl, String directorySourceUrl) {}

    @GetMapping("/courses")
    public List<CourseView> courses() {
        return catalogService.listCourses().stream().map(course -> {
            var official = directory.find(course.code()).orElse(null);
            return new CourseView(course.id(), course.code(), course.name(), course.campus(), course.degreeType(),
                    official == null ? null : official.unitName(), official == null ? null : official.unitAbbreviation(),
                    official == null ? null : official.shift(), official == null ? null : official.officialUrl(),
                    official == null ? null : official.sourceUrl());
        }).toList();
    }

    @GetMapping("/undergraduate-directory")
    public UfamUndergraduateDirectory.Snapshot undergraduateDirectory() { return directory.catalog(); }

    @GetMapping("/courses/{courseId}/curricula")
    public List<CurriculumCatalogItem> curricula(@PathVariable UUID courseId) {
        return catalogService.listCurricula(courseId);
    }
}
