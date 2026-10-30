package br.edu.ufam.planner.schedule.presentation;

import br.edu.ufam.planner.schedule.application.EcampusDocumentParser;
import br.edu.ufam.planner.schedule.application.EcampusEnrollmentImportService;
import br.edu.ufam.planner.schedule.application.EcampusHistoryImportService;
import br.edu.ufam.planner.schedule.application.EcampusOnboardingService;
import br.edu.ufam.planner.profile.presentation.SaveAcademicProfileRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/study/import")
public class EcampusDocumentImportController {
    private final EcampusDocumentParser parser;
    private final EcampusEnrollmentImportService enrollmentImport;
    private final EcampusHistoryImportService historyImport;
    private final EcampusOnboardingService onboarding;

    public record OnboardingRequest(@NotNull @Valid SaveAcademicProfileRequest profile,
            List<EcampusHistoryImportService.Choice> selection) {}

    public EcampusDocumentImportController(EcampusDocumentParser parser,
            EcampusEnrollmentImportService enrollmentImport, EcampusHistoryImportService historyImport,
            EcampusOnboardingService onboarding) {
        this.parser = parser;
        this.enrollmentImport = enrollmentImport;
        this.historyImport = historyImport;
        this.onboarding = onboarding;
    }

    @PostMapping(value = "/enrollment/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EcampusEnrollmentImportService.Preview enrollment(
            @AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file) {
        return enrollmentImport.preview(UUID.fromString(jwt.getSubject()), file);
    }

    @PostMapping(value = "/enrollment/confirm", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EcampusEnrollmentImportService.Result confirmEnrollment(
            @AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file,
            @RequestPart("selection") String selection) {
        return enrollmentImport.confirm(UUID.fromString(jwt.getSubject()), file, selection);
    }

    @PostMapping(value = "/history/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EcampusDocumentParser.HistoryPreview history(@RequestPart("file") MultipartFile file) {
        return parser.history(file);
    }

    @PostMapping(value = "/history/confirm", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EcampusHistoryImportService.Result confirmHistory(
            @AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file,
            @RequestPart("selection") String selection) {
        return historyImport.confirm(UUID.fromString(jwt.getSubject()), file, selection);
    }

    @PostMapping(value = "/history/onboard", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EcampusOnboardingService.Result onboard(
            @AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("request") OnboardingRequest request) {
        return onboarding.confirm(UUID.fromString(jwt.getSubject()), file, request.profile(), request.selection());
    }
}
