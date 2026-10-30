package br.edu.ufam.planner.integration.ufam.application;

public class UfamIntegrationException extends RuntimeException {

    private final String code;

    public UfamIntegrationException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public UfamIntegrationException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
