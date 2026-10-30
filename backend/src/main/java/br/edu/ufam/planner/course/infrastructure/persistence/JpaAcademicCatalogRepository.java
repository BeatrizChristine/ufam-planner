package br.edu.ufam.planner.course.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.course.domain.AcademicCatalogRepository;
import br.edu.ufam.planner.course.domain.CourseCatalogItem;
import br.edu.ufam.planner.course.domain.CurriculumCatalogItem;
import org.springframework.stereotype.Repository;

@Repository
public class JpaAcademicCatalogRepository implements AcademicCatalogRepository {

    private final SpringDataCourseRepository courses;
    private final SpringDataCurriculumRepository curricula;

    public JpaAcademicCatalogRepository(
            SpringDataCourseRepository courses,
            SpringDataCurriculumRepository curricula) {
        this.courses = courses;
        this.curricula = curricula;
    }

    @Override
    public List<CourseCatalogItem> findActiveCourses() {
        return courses.findAllByActiveTrueOrderByNameAsc().stream().map(JpaAcademicCatalogRepository::toDomain).toList();
    }

    @Override
    public Optional<CourseCatalogItem> findActiveCourse(UUID courseId) {
        return courses.findByIdAndActiveTrue(courseId).map(JpaAcademicCatalogRepository::toDomain);
    }

    @Override
    public List<CurriculumCatalogItem> findActiveCurriculaByCourse(UUID courseId) {
        return curricula.findAllByCourseIdAndActiveTrueOrderByEffectiveFromDesc(courseId).stream()
                .map(JpaAcademicCatalogRepository::toDomain)
                .toList();
    }

    @Override
    public Optional<CurriculumCatalogItem> findActiveCurriculum(UUID curriculumId) {
        return curricula.findByIdAndActiveTrue(curriculumId).map(JpaAcademicCatalogRepository::toDomain);
    }

    private static CourseCatalogItem toDomain(CourseJpaEntity source) {
        return new CourseCatalogItem(source.id, source.code, source.name, source.campus, source.degreeType);
    }

    private static CurriculumCatalogItem toDomain(CurriculumJpaEntity source) {
        return new CurriculumCatalogItem(
                source.id,
                source.courseId,
                source.code,
                source.effectiveFrom,
                source.totalWorkloadHours,
                source.expectedPeriods);
    }
}
