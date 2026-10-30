package br.edu.ufam.planner.progress.presentation;

import java.util.UUID;

import br.edu.ufam.planner.progress.application.DashboardQueryService;
import br.edu.ufam.planner.progress.application.DashboardSummary;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardQueryService dashboardQueryService;

    public DashboardController(DashboardQueryService dashboardQueryService) {
        this.dashboardQueryService = dashboardQueryService;
    }

    @GetMapping("/summary")
    public DashboardSummary summary(@AuthenticationPrincipal Jwt jwt) {
        return dashboardQueryService.getSummary(UUID.fromString(jwt.getSubject()));
    }
}
