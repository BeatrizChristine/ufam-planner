package br.edu.ufam.planner.auth.application;

import java.util.UUID;

import br.edu.ufam.planner.user.domain.UserAccount;

public record UserView(
        UUID id,
        String name,
        String username,
        String email,
        String role,
        boolean emailVerified) {

    public static UserView from(UserAccount account) {
        return new UserView(
                account.id(),
                account.fullName(),
                account.username(),
                account.email(),
                account.role().name(),
                account.emailVerified());
    }

    @Override
    public String toString() {
        return "UserView[id=" + id + ", username=" + username + ", role=" + role + ", emailVerified=" + emailVerified + "]";
    }
}
