package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Informe seu e-mail ou username.")
        @Size(max = 254)
        String identifier,

        @NotBlank(message = "Informe sua senha.")
        @Size(max = 72)
        String password) {

    @Override
    public String toString() {
        return "LoginRequest[identifier=***, password=***]";
    }
}
