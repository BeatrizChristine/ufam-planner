package br.edu.ufam.planner.auth.presentation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResendVerificationRequest(@NotBlank @Email @Size(max = 254) String email) {
    @Override
    public String toString() {
        return "ResendVerificationRequest[email=***]";
    }
}
