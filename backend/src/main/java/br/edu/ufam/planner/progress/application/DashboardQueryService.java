package br.edu.ufam.planner.progress.application;

import java.util.UUID;

import br.edu.ufam.planner.auth.application.AuthService;
import br.edu.ufam.planner.profile.application.AcademicProfileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardQueryService {

    private final AuthService authService;
    private final AcademicProfileService profileService;

    public DashboardQueryService(AuthService authService, AcademicProfileService profileService) {
        this.authService = authService;
        this.profileService = profileService;
    }

    @Transactional(readOnly = true)
    public DashboardSummary getSummary(UUID userId) {
        var user = authService.getUser(userId);
        var profile = profileService.getByUserId(userId);

        if (!profile.completed()) {
            return new DashboardSummary(
                    false,
                    user.name(),
                    profile.courseId(),
                    profile.courseCode(),
                    profile.courseName(),
                    profile.curriculumId(),
                    profile.curriculumCode(),
                    profile.admissionYear(),
                    profile.admissionTerm(),
                    profile.currentPeriod(),
                    false);
        }

        return new DashboardSummary(
                true,
                user.name(),
                profile.courseId(),
                profile.courseCode(),
                profile.courseName(),
                profile.curriculumId(),
                profile.curriculumCode(),
                profile.admissionYear(),
                profile.admissionTerm(),
                profile.currentPeriod(),
                false);
    }
}
