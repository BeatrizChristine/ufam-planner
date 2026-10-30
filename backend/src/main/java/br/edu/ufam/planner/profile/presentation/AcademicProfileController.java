package br.edu.ufam.planner.profile.presentation;

import java.util.UUID;

import br.edu.ufam.planner.profile.application.AcademicProfileService;
import br.edu.ufam.planner.profile.application.AcademicProfileView;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/academic-profile")
public class AcademicProfileController {

    private final AcademicProfileService profileService;

    public AcademicProfileController(AcademicProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public AcademicProfileView me(@AuthenticationPrincipal Jwt jwt) {
        return profileService.getByUserId(UUID.fromString(jwt.getSubject()));
    }

    @PutMapping("/me")
    public AcademicProfileView save(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SaveAcademicProfileRequest request) {
        return profileService.save(
                UUID.fromString(jwt.getSubject()),
                request.courseId(),
                request.curriculumId(),
                request.admissionYear(),
                request.admissionTerm(),
                request.registrationNumber(),
                request.currentPeriod());
    }

    @PutMapping("/me/course")
    public AcademicProfileView start(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StartAcademicProfileRequest request) {
        return profileService.start(
                UUID.fromString(jwt.getSubject()),
                request.courseId(),
                request.admissionYear(),
                request.admissionTerm(),
                request.registrationNumber(),
                request.currentPeriod());
    }
}
