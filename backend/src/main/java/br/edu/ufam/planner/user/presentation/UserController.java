package br.edu.ufam.planner.user.presentation;

import java.util.UUID;

import br.edu.ufam.planner.auth.application.AuthService;
import br.edu.ufam.planner.auth.application.UserView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public UserView me(@AuthenticationPrincipal Jwt jwt) {
        return authService.getUser(UUID.fromString(jwt.getSubject()));
    }
}

