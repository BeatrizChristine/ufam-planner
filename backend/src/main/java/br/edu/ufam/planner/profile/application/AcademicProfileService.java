package br.edu.ufam.planner.profile.application;

import java.util.UUID;

import br.edu.ufam.planner.course.application.AcademicCatalogService;
import br.edu.ufam.planner.course.domain.CourseCatalogItem;
import br.edu.ufam.planner.course.domain.CurriculumCatalogItem;
import br.edu.ufam.planner.profile.domain.StudentProfile;
import br.edu.ufam.planner.profile.domain.StudentProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcademicProfileService {

    private final StudentProfileRepository profiles;
    private final AcademicCatalogService catalog;

    public AcademicProfileService(StudentProfileRepository profiles, AcademicCatalogService catalog) {
        this.profiles = profiles;
        this.catalog = catalog;
    }

    @Transactional(readOnly = true)
    public AcademicProfileView getByUserId(UUID userId) {
        return profiles.findByUserId(userId)
                .map(this::toView)
                .orElseGet(AcademicProfileView::incomplete);
    }

    @Transactional
    public AcademicProfileView start(
            UUID userId,
            UUID courseId,
            Integer admissionYear,
            Integer admissionTerm) {
        return start(userId, courseId, admissionYear, admissionTerm, null, null);
    }

    @Transactional
    public AcademicProfileView start(
            UUID userId,
            UUID courseId,
            Integer admissionYear,
            Integer admissionTerm,
            String registrationNumber,
            Integer currentPeriod) {
        var course = catalog.findCourse(courseId)
                .orElseThrow(() -> invalid("course_not_found", "O curso selecionado não está disponível."));

        var profile = profiles.findByUserId(userId)
                .map(current -> current.update(
                        courseId,
                        courseId.equals(current.courseId()) ? current.curriculumId() : null,
                        admissionYear,
                        admissionTerm,
                        registrationNumber == null ? current.registrationNumber() : normalizeOptional(registrationNumber),
                        currentPeriod == null ? current.currentPeriod() : currentPeriod))
                .orElseGet(() -> StudentProfile.create(
                        userId, courseId, null, admissionYear, admissionTerm,
                        normalizeOptional(registrationNumber), currentPeriod));

        var curriculum = profile.curriculumId() == null
                ? null
                : catalog.findCurriculum(profile.curriculumId()).orElse(null);
        return toView(profiles.save(profile), course, curriculum);
    }

    @Transactional
    public AcademicProfileView save(
            UUID userId,
            UUID courseId,
            UUID curriculumId,
            Integer admissionYear,
            Integer admissionTerm,
            String registrationNumber,
            Integer currentPeriod) {
        var course = catalog.findCourse(courseId)
                .orElseThrow(() -> invalid("course_not_found", "O curso selecionado não está disponível."));
        var curriculum = catalog.findCurriculum(curriculumId)
                .orElseThrow(() -> invalid("curriculum_not_found", "A matriz selecionada não está disponível."));

        if (!curriculum.courseId().equals(course.id())) {
            throw invalid("curriculum_course_mismatch", "A matriz selecionada não pertence ao curso informado.");
        }

        var normalizedRegistration = normalizeOptional(registrationNumber);
        var profile = profiles.findByUserId(userId)
                .map(current -> current.update(
                        courseId, curriculumId, admissionYear, admissionTerm,
                        normalizedRegistration, currentPeriod))
                .orElseGet(() -> StudentProfile.create(
                        userId, courseId, curriculumId, admissionYear, admissionTerm,
                        normalizedRegistration, currentPeriod));

        return toView(profiles.save(profile), course, curriculum);
    }

    private AcademicProfileView toView(StudentProfile profile) {
        var course = profile.courseId() == null
                ? null
                : catalog.findCourse(profile.courseId())
                        .orElseThrow(() -> invalid("course_not_found", "O curso vinculado ao perfil não está disponível."));
        var curriculum = profile.curriculumId() == null
                ? null
                : catalog.findCurriculum(profile.curriculumId())
                        .orElseThrow(() -> invalid("curriculum_not_found", "A matriz vinculada ao perfil não está disponível."));
        return toView(profile, course, curriculum);
    }

    private static AcademicProfileView toView(
            StudentProfile profile,
            CourseCatalogItem course,
            CurriculumCatalogItem curriculum) {
        return new AcademicProfileView(
                isComplete(profile),
                profile.id(),
                course == null ? null : course.id(),
                course == null ? null : course.code(),
                course == null ? null : course.name(),
                curriculum == null ? null : curriculum.id(),
                curriculum == null ? null : curriculum.code(),
                profile.admissionYear(),
                profile.admissionTerm(),
                profile.registrationNumber(),
                profile.currentPeriod(),
                profile.updatedAt());
    }

    private static String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean isComplete(StudentProfile profile) {
        return profile.courseId() != null
                && profile.curriculumId() != null
                && profile.admissionYear() != null
                && profile.admissionTerm() != null;
    }

    private static ProfileException invalid(String code, String message) {
        return new ProfileException(HttpStatus.BAD_REQUEST, code, message);
    }
}
