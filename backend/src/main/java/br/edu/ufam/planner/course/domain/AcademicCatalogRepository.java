package br.edu.ufam.planner.course.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademicCatalogRepository {

    List<CourseCatalogItem> findActiveCourses();

    Optional<CourseCatalogItem> findActiveCourse(UUID courseId);

    List<CurriculumCatalogItem> findActiveCurriculaByCourse(UUID courseId);

    Optional<CurriculumCatalogItem> findActiveCurriculum(UUID curriculumId);
}
