package br.edu.ufam.planner.progress.application;

import java.util.List;
import java.util.UUID;

import br.edu.ufam.planner.curriculum.domain.CurriculumMap;
import br.edu.ufam.planner.curriculum.domain.CurriculumMapRepository;
import br.edu.ufam.planner.profile.domain.StudentProfile;
import br.edu.ufam.planner.profile.domain.StudentProfileRepository;
import br.edu.ufam.planner.progress.domain.CompletedDisciplineRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CompletedDisciplineService {

    private final StudentProfileRepository profiles;
    private final CurriculumMapRepository curricula;
    private final CompletedDisciplineRepository progress;

    public CompletedDisciplineService(
            StudentProfileRepository profiles,
            CurriculumMapRepository curricula,
            CompletedDisciplineRepository progress) {
        this.profiles = profiles;
        this.curricula = curricula;
        this.progress = progress;
    }

    @Transactional(readOnly = true)
    public List<String> getCompletedCodes(UUID userId) {
        var profile = requireProfile(userId);
        var curriculum = requireCurriculum(profile);
        var completedIds = progress.findCompletedIds(profile.id(), curriculum.id());
        return curriculum.components().stream()
                .filter(component -> completedIds.contains(component.disciplineId()))
                .map(CurriculumMap.Component::code)
                .sorted()
                .toList();
    }

    @Transactional
    public List<String> setCompleted(UUID userId, UUID disciplineId, boolean completed) {
        var profile = requireProfile(userId);
        var curriculum = requireCurriculum(profile);
        if (curriculum.components().stream().noneMatch(component -> component.disciplineId().equals(disciplineId))) {
            throw new ProgressException(HttpStatus.BAD_REQUEST, "discipline_not_in_curriculum",
                    "A disciplina não pertence à sua matriz curricular.");
        }
        progress.setCompleted(profile.id(), disciplineId, completed);
        return getCompletedCodes(userId);
    }

    @Transactional
    public void setCompletedFromHistory(UUID userId, UUID disciplineId) {
        var profile = requireProfile(userId);
        var curriculum = requireCurriculum(profile);
        if (curriculum.components().stream().noneMatch(component -> component.disciplineId().equals(disciplineId))) {
            throw new ProgressException(HttpStatus.BAD_REQUEST, "discipline_not_in_curriculum",
                    "A disciplina não pertence à sua matriz curricular.");
        }
        progress.setCompletedFromHistory(profile.id(), disciplineId);
    }

    private StudentProfile requireProfile(UUID userId) {
        return profiles.findByUserId(userId)
                .orElseThrow(() -> new ProgressException(HttpStatus.BAD_REQUEST, "profile_required",
                        "Configure seu perfil acadêmico para acompanhar o progresso."));
    }

    private CurriculumMap requireCurriculum(StudentProfile profile) {
        if (profile.curriculumId() == null) {
            throw new ProgressException(HttpStatus.BAD_REQUEST, "curriculum_required",
                    "Escolha uma matriz curricular antes de registrar disciplinas concluídas.");
        }
        return curricula.findById(profile.curriculumId())
                .orElseThrow(() -> new ProgressException(HttpStatus.NOT_FOUND, "curriculum_not_found",
                        "A matriz curricular vinculada ao perfil não está disponível."));
    }
}
