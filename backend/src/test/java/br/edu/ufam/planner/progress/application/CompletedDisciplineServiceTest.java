package br.edu.ufam.planner.progress.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import br.edu.ufam.planner.curriculum.domain.CurriculumMap;
import br.edu.ufam.planner.curriculum.domain.CurriculumMapRepository;
import br.edu.ufam.planner.profile.domain.StudentProfile;
import br.edu.ufam.planner.profile.domain.StudentProfileRepository;
import br.edu.ufam.planner.progress.domain.CompletedDisciplineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompletedDisciplineServiceTest {

    @Mock StudentProfileRepository profiles;
    @Mock CurriculumMapRepository curricula;
    @Mock CompletedDisciplineRepository progress;

    CompletedDisciplineService service;

    @BeforeEach
    void setUp() {
        service = new CompletedDisciplineService(profiles, curricula, progress);
    }

    @Test
    void listsOnlyCompletedDisciplinesFromTheCurrentCurriculum() {
        var userId = UUID.randomUUID();
        var profile = profile(userId);
        var first = component("IEM011");
        var second = component("IEM021");
        var map = curriculum(profile.curriculumId(), first, second);
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(curricula.findById(profile.curriculumId())).thenReturn(Optional.of(map));
        when(progress.findCompletedIds(profile.id(), map.id())).thenReturn(Set.of(first.disciplineId()));

        assertThat(service.getCompletedCodes(userId)).containsExactly("IEM011");
    }

    @Test
    void savesACompletedDisciplineForTheAuthenticatedProfile() {
        var userId = UUID.randomUUID();
        var profile = profile(userId);
        var component = component("IEM011");
        var map = curriculum(profile.curriculumId(), component);
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(curricula.findById(profile.curriculumId())).thenReturn(Optional.of(map));
        when(progress.findCompletedIds(profile.id(), map.id())).thenReturn(Set.of(component.disciplineId()));

        assertThat(service.setCompleted(userId, component.disciplineId(), true)).containsExactly("IEM011");
        verify(progress).setCompleted(profile.id(), component.disciplineId(), true);
    }

    @Test
    void canUndoACompletionWithoutAffectingOtherProfiles() {
        var userId = UUID.randomUUID();
        var profile = profile(userId);
        var component = component("IEM011");
        var map = curriculum(profile.curriculumId(), component);
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(curricula.findById(profile.curriculumId())).thenReturn(Optional.of(map));
        when(progress.findCompletedIds(profile.id(), map.id())).thenReturn(Set.of());

        assertThat(service.setCompleted(userId, component.disciplineId(), false)).isEmpty();
        verify(progress).setCompleted(profile.id(), component.disciplineId(), false);
    }

    @Test
    void rejectsADisciplineOutsideTheStudentsCurriculum() {
        var userId = UUID.randomUUID();
        var profile = profile(userId);
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(curricula.findById(profile.curriculumId()))
                .thenReturn(Optional.of(curriculum(profile.curriculumId(), component("IEM011"))));

        assertThatThrownBy(() -> service.setCompleted(userId, UUID.randomUUID(), true))
                .isInstanceOfSatisfying(ProgressException.class, exception ->
                        assertThat(exception.code()).isEqualTo("discipline_not_in_curriculum"));
    }

    private static StudentProfile profile(UUID userId) {
        return StudentProfile.create(userId, UUID.randomUUID(), UUID.randomUUID(), 2024, 1, null, 1);
    }

    private static CurriculumMap.Component component(String code) {
        return new CurriculumMap.Component(UUID.randomUUID(), UUID.randomUUID(), code, code, 90,
                1, "MANDATORY", List.of(), List.of());
    }

    private static CurriculumMap curriculum(UUID id, CurriculumMap.Component... components) {
        return new CurriculumMap(id, "FT05-2009-1", null, "FT05", "Engenharia da Computação",
                3675, 3105, 90, 480, 10, null, List.of(components));
    }
}
