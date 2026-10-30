package br.edu.ufam.planner.auth.application;

public interface GoogleCredentialVerifier {
    record Identity(String subject, String email, String name) {}
    Identity verify(String credential);
}
