package br.edu.ufam.planner.schedule.application;

import java.util.List;
import java.util.UUID;

import br.edu.ufam.planner.profile.application.AcademicProfileService;
import br.edu.ufam.planner.profile.application.AcademicProfileView;
import br.edu.ufam.planner.profile.presentation.SaveAcademicProfileRequest;
import br.edu.ufam.planner.progress.application.ProgressException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EcampusOnboardingService {
    private final EcampusDocumentParser parser;
    private final AcademicProfileService profiles;
    private final EcampusHistoryImportService historyImport;
    private final EntityManager entityManager;
    private final ObjectMapper mapper;

    public EcampusOnboardingService(EcampusDocumentParser parser, AcademicProfileService profiles,
            EcampusHistoryImportService historyImport, EntityManager entityManager, ObjectMapper mapper) {
        this.parser = parser;
        this.profiles = profiles;
        this.historyImport = historyImport;
        this.entityManager = entityManager;
        this.mapper = mapper;
    }

    public record Result(AcademicProfileView profile, int added, int unchanged) {}

    @Transactional
    public Result confirm(UUID userId, MultipartFile file, SaveAcademicProfileRequest request,
            List<EcampusHistoryImportService.Choice> selection) {
        if (profiles.getByUserId(userId).completed())
            throw invalid("Seu perfil já está configurado. Atualize o histórico pela página de importação.");

        var document = parser.history(file);
        if (document.courseCode() == null)
            throw invalid("O curso não foi identificado no histórico. Revise o documento antes de continuar.");
        if (document.registrationNumber() != null && request.registrationNumber() != null
                && !document.registrationNumber().equals(request.registrationNumber().trim()))
            throw invalid("A matrícula informada é diferente da matrícula do histórico. Confira o documento antes de continuar.");

        var profile = profiles.save(userId, request.courseId(), request.curriculumId(),
                request.admissionYear(), request.admissionTerm(), request.registrationNumber(), request.currentPeriod());
        if (!document.courseCode().equalsIgnoreCase(profile.courseCode()))
            throw invalid("O curso do histórico é diferente do curso selecionado. Nenhum dado foi salvo.");

        // A importação consulta o perfil por JDBC; a gravação JPA deve estar visível na mesma transação.
        entityManager.flush();

        if (selection == null || selection.isEmpty()) return new Result(profile, 0, 0);
        try {
            var saved = historyImport.confirm(userId, file, mapper.writeValueAsString(selection));
            return new Result(profile, saved.added(), saved.unchanged());
        } catch (JsonProcessingException exception) {
            throw invalid("A seleção de disciplinas não pôde ser processada. Revise e tente novamente.");
        }
    }

    private static ProgressException invalid(String message) {
        return new ProgressException(HttpStatus.BAD_REQUEST, "ecampus_onboarding_invalid", message);
    }
}
