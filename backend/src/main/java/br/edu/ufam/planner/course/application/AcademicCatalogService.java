package br.edu.ufam.planner.course.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.course.domain.AcademicCatalogRepository;
import br.edu.ufam.planner.course.domain.CourseCatalogItem;
import br.edu.ufam.planner.course.domain.CurriculumCatalogItem;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcademicCatalogService {

    private final AcademicCatalogRepository catalog;

    public AcademicCatalogService(AcademicCatalogRepository catalog) {
        this.catalog = catalog;
    }

    @Transactional(readOnly = true)
    public List<CourseCatalogItem> listCourses() {
        return catalog.findActiveCourses();
    }

    @Transactional(readOnly = true)
    public List<CurriculumCatalogItem> listCurricula(UUID courseId) {
        return catalog.findActiveCurriculaByCourse(courseId);
    }

    @Transactional(readOnly = true)
    public Optional<CourseCatalogItem> findCourse(UUID courseId) {
        return catalog.findActiveCourse(courseId);
    }

    @Transactional(readOnly = true)
    public Optional<CurriculumCatalogItem> findCurriculum(UUID curriculumId) {
        return catalog.findActiveCurriculum(curriculumId);
    }
}
