package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "O link de recuperação é obrigatório.")
        @Size(min = 32, max = 128, message = "O link de recuperação é inválido.")
        String token,
        @NotBlank(message = "Crie uma nova senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String password) {
    @Override
    public String toString() {
        return "ResetPasswordRequest[token=***, password=***]";
    }
}
