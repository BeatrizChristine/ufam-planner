package br.edu.ufam.planner.profile.presentation;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StartAcademicProfileRequest(
        @NotNull(message = "Selecione um curso.")
        UUID courseId,

        @NotNull(message = "Informe o ano de ingresso.")
        @Min(value = 1909, message = "Informe um ano de ingresso válido.")
        @Max(value = 2100, message = "Informe um ano de ingresso válido.")
        Integer admissionYear,

        @NotNull(message = "Informe o semestre de ingresso.")
        @Min(value = 1, message = "O semestre deve ser 1 ou 2.")
        @Max(value = 2, message = "O semestre deve ser 1 ou 2.")
        Integer admissionTerm,

        @Size(max = 40, message = "A matrícula deve ter no máximo 40 caracteres.")
        @Pattern(regexp = "^[A-Za-z0-9._/-]*$", message = "A matrícula contém caracteres inválidos.")
        String registrationNumber,

        @Min(value = 1, message = "O período atual deve ser maior que zero.")
        @Max(value = 20, message = "O período atual deve ser no máximo 20.")
        Integer currentPeriod) {
}
