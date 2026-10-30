package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail é muito longo.")
        String email) {
    @Override
    public String toString() {
        return "ForgotPasswordRequest[email=***]";
    }
}
