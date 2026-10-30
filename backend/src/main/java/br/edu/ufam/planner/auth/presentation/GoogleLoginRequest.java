package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank(message = "A credencial do Google não foi recebida.")
        @Size(max = 8192, message = "A credencial do Google é inválida.")
        String credential) {
    @Override
    public String toString() {
        return "GoogleLoginRequest[credential=***]";
    }
}
