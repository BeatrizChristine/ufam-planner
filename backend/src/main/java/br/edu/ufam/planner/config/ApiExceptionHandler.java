package br.edu.ufam.planner.config;

import java.net.URI;
import java.sql.SQLException;
import java.util.Map;
import java.util.stream.Collectors;

import br.edu.ufam.planner.auth.application.AuthException;
import br.edu.ufam.planner.integration.ufam.application.UfamIntegrationException;
import br.edu.ufam.planner.profile.application.ProfileException;
import br.edu.ufam.planner.progress.application.ProgressException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ProblemDetail> handleUploadTooLarge(MaxUploadSizeExceededException exception) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE,
                "O PDF ultrapassa 3 MB. Exporte um arquivo menor do eCampus.");
        problem.setTitle("Arquivo grande demais");
        problem.setProperty("code", "ecampus_pdf_too_large");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(problem);
    }

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ProblemDetail> handleAuthException(AuthException exception) {
        var problem = ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage());
        problem.setTitle("Não foi possível concluir a autenticação");
        problem.setType(URI.create("https://ufamplanner.local/problems/" + exception.code()));
        problem.setProperty("code", exception.code());
        return ResponseEntity.status(exception.status()).body(problem);
    }

    @ExceptionHandler(ProfileException.class)
    ResponseEntity<ProblemDetail> handleProfileException(ProfileException exception) {
        var problem = ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage());
        problem.setTitle("Não foi possível salvar o perfil acadêmico");
        problem.setType(URI.create("https://ufamplanner.local/problems/" + exception.code()));
        problem.setProperty("code", exception.code());
        return ResponseEntity.status(exception.status()).body(problem);
    }

    @ExceptionHandler(ProgressException.class)
    ResponseEntity<ProblemDetail> handleProgressException(ProgressException exception) {
        var problem = ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage());
        problem.setTitle("Não foi possível atualizar o progresso acadêmico");
        problem.setType(URI.create("https://ufamplanner.local/problems/" + exception.code()));
        problem.setProperty("code", exception.code());
        return ResponseEntity.status(exception.status()).body(problem);
    }

    @ExceptionHandler(UfamIntegrationException.class)
    ResponseEntity<ProblemDetail> handleUfamIntegrationException(UfamIntegrationException exception) {
        var status = exception.code().equals("ufam_ecampus_unavailable")
                ? HttpStatus.BAD_GATEWAY
                : HttpStatus.BAD_REQUEST;
        var problem = ProblemDetail.forStatusAndDetail(status, exception.getMessage());
        problem.setTitle("Não foi possível sincronizar os dados públicos da UFAM");
        problem.setType(URI.create("https://ufamplanner.local/problems/" + exception.code()));
        problem.setProperty("code", exception.code());
        return ResponseEntity.status(status).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException exception) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Revise os campos informados.");
        problem.setTitle("Dados inválidos");
        problem.setType(URI.create("https://ufamplanner.local/problems/validation"));
        Map<String, String> fields = exception.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        field -> field.getField(),
                        field -> field.getDefaultMessage() == null ? "Valor inválido." : field.getDefaultMessage(),
                        (first, ignored) -> first));
        problem.setProperty("code", "validation_error");
        problem.setProperty("fields", fields);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> handleConflict(DataIntegrityViolationException exception) {
        if (!(exception.getMostSpecificCause() instanceof SQLException sql)
                || !"23505".equals(sql.getSQLState())) {
            var problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível salvar os dados agora. Tente novamente em instantes.");
            problem.setTitle("Falha ao salvar os dados");
            problem.setProperty("code", "data_integrity_error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
        }
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Já existe um cadastro com um dos dados informados.");
        problem.setTitle("Dados duplicados");
        problem.setType(URI.create("https://ufamplanner.local/problems/account-conflict"));
        problem.setProperty("code", "account_conflict");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }
}
