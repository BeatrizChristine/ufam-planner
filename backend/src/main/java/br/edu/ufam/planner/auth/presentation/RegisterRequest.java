package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Informe seu nome.")
        @Size(max = 160, message = "O nome deve ter no máximo 160 caracteres.")
        String name,

        @NotBlank(message = "Escolha um username.")
        @Pattern(
                regexp = "^[a-zA-Z0-9._]{3,30}$",
                message = "O username deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto ou underline.")
        String username,

        @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail é muito longo.")
        String email,

        @NotBlank(message = "Crie uma senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String password) {

    @Override
    public String toString() {
        return "RegisterRequest[name=***, username=" + username + ", email=***, password=***]";
    }
}
