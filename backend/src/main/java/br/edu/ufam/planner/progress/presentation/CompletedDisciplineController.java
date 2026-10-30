package br.edu.ufam.planner.progress.presentation;

import java.util.List;
import java.util.UUID;

import br.edu.ufam.planner.progress.application.CompletedDisciplineService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/progress/me")
public class CompletedDisciplineController {

    private final CompletedDisciplineService service;

    public CompletedDisciplineController(CompletedDisciplineService service) {
        this.service = service;
    }

    @GetMapping("/completed")
    public CompletedResponse getCompleted(@AuthenticationPrincipal Jwt jwt) {
        return new CompletedResponse(service.getCompletedCodes(UUID.fromString(jwt.getSubject())));
    }

    @PutMapping("/disciplines/{disciplineId}")
    public CompletedResponse setCompleted(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID disciplineId,
            @Valid @RequestBody CompletionRequest request) {
        return new CompletedResponse(service.setCompleted(
                UUID.fromString(jwt.getSubject()), disciplineId, request.completed()));
    }

    public record CompletionRequest(@NotNull Boolean completed) {
    }

    public record CompletedResponse(List<String> completedCodes) {
    }
}
