package br.edu.ufam.planner.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.course.application.AcademicCatalogService;
import br.edu.ufam.planner.course.domain.CourseCatalogItem;
import br.edu.ufam.planner.course.domain.CurriculumCatalogItem;
import br.edu.ufam.planner.profile.domain.StudentProfile;
import br.edu.ufam.planner.profile.domain.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AcademicProfileServiceTest {

    @Mock
    StudentProfileRepository profiles;

    @Mock
    AcademicCatalogService catalog;

    AcademicProfileService service;

    @BeforeEach
    void setUp() {
        service = new AcademicProfileService(profiles, catalog);
    }

    @Test
    void shouldCreateProfileWithAnOptionalCurrentPeriod() {
        var userId = UUID.randomUUID();
        var courseId = UUID.randomUUID();
        var curriculumId = UUID.randomUUID();
        var course = new CourseCatalogItem(courseId, "FT05", "Engenharia da Computação", "Manaus", "Bacharelado");
        var curriculum = new CurriculumCatalogItem(curriculumId, courseId, "FT05-DEMO-2024", LocalDate.of(2024, 1, 1), 3600, 10);

        when(catalog.findCourse(courseId)).thenReturn(Optional.of(course));
        when(catalog.findCurriculum(curriculumId)).thenReturn(Optional.of(curriculum));
        when(profiles.findByUserId(userId)).thenReturn(Optional.empty());
        when(profiles.save(any(StudentProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.save(userId, courseId, curriculumId, 2024, 1, "22350000", null);

        assertThat(result.completed()).isTrue();
        assertThat(result.currentPeriod()).isNull();
        assertThat(result.courseCode()).isEqualTo("FT05");
    }

    @Test
    void shouldRejectACurriculumFromAnotherCourse() {
        var selectedCourseId = UUID.randomUUID();
        var otherCourseId = UUID.randomUUID();
        var curriculumId = UUID.randomUUID();

        when(catalog.findCourse(selectedCourseId)).thenReturn(Optional.of(
                new CourseCatalogItem(selectedCourseId, "FT05", "Engenharia da Computação", "Manaus", "Bacharelado")));
        when(catalog.findCurriculum(curriculumId)).thenReturn(Optional.of(
                new CurriculumCatalogItem(curriculumId, otherCourseId, "OTHER", LocalDate.now(), 3000, 10)));

        assertThatThrownBy(() -> service.save(
                UUID.randomUUID(), selectedCourseId, curriculumId, 2024, 1, null, null))
                .isInstanceOfSatisfying(ProfileException.class, exception ->
                        assertThat(exception.code()).isEqualTo("curriculum_course_mismatch"));
    }

    @Test
    void shouldStartAProfileEvenWhenTheCourseHasNoPublishedCurriculum() {
        var userId = UUID.randomUUID();
        var courseId = UUID.randomUUID();
        var course = new CourseCatalogItem(courseId, "IC01", "Ciência da Computação", "Manaus", "Bacharelado");

        when(catalog.findCourse(courseId)).thenReturn(Optional.of(course));
        when(profiles.findByUserId(userId)).thenReturn(Optional.empty());
        when(profiles.save(any(StudentProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.start(userId, courseId, 2026, 1);

        assertThat(result.completed()).isFalse();
        assertThat(result.courseId()).isEqualTo(courseId);
        assertThat(result.courseCode()).isEqualTo("IC01");
        assertThat(result.curriculumId()).isNull();
        assertThat(result.admissionYear()).isEqualTo(2026);
    }

    @Test
    void shouldReturnTheCourseFromAPartialProfile() {
        var userId = UUID.randomUUID();
        var courseId = UUID.randomUUID();
        var profile = StudentProfile.create(userId, courseId, null, 2025, 2, null, null);

        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(catalog.findCourse(courseId)).thenReturn(Optional.of(
                new CourseCatalogItem(courseId, "FT05", "Engenharia da Computação", "Manaus", "Bacharelado")));

        var result = service.getByUserId(userId);

        assertThat(result.completed()).isFalse();
        assertThat(result.courseId()).isEqualTo(courseId);
        assertThat(result.courseName()).isEqualTo("Engenharia da Computação");
    }
}
