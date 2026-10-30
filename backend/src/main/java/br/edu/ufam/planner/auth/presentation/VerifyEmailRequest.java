package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = "^[0-9]{6}$", message = "Informe o código de 6 dígitos.") String code) {
    @Override
    public String toString() {
        return "VerifyEmailRequest[email=***, code=***]";
    }
}
