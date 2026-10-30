package br.edu.ufam.planner.schedule.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import br.edu.ufam.planner.profile.application.AcademicProfileService;
import br.edu.ufam.planner.profile.application.AcademicProfileView;
import br.edu.ufam.planner.profile.presentation.SaveAcademicProfileRequest;
import br.edu.ufam.planner.progress.application.ProgressException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class EcampusOnboardingServiceTest {
    @Mock EcampusDocumentParser parser;
    @Mock AcademicProfileService profiles;
    @Mock EcampusHistoryImportService historyImport;
    @Mock EntityManager entityManager;

    private final ObjectMapper mapper = new ObjectMapper();
    private final UUID userId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();
    private final UUID curriculumId = UUID.randomUUID();
    private final MockMultipartFile file = new MockMultipartFile("file", "historico.pdf", "application/pdf", new byte[] { 1 });

    @Test
    void savesProfileAndSelectedApprovalsTogetherAfterReview() {
        var request = new SaveAcademicProfileRequest(courseId, curriculumId, 2022, 2, "22350000", null);
        var profile = new AcademicProfileView(true, UUID.randomUUID(), courseId, "FT05", "Engenharia da Computação",
                curriculumId, "FT05-2009-1", 2022, 2, "22350000", null, null);
        var selected = List.of(new EcampusHistoryImportService.Choice("IEM011", "Cálculo I"));
        when(profiles.getByUserId(userId)).thenReturn(AcademicProfileView.incomplete());
        when(parser.history(file)).thenReturn(document("FT05", "22350000"));
        when(profiles.save(userId, courseId, curriculumId, 2022, 2, "22350000", null)).thenReturn(profile);
        when(historyImport.confirm(eq(userId), eq(file), anyString()))
                .thenReturn(new EcampusHistoryImportService.Result(1, 0, List.of("IEM011")));

        var result = service().confirm(userId, file, request, selected);

        assertEquals(profile, result.profile());
        assertEquals(1, result.added());
        verify(entityManager).flush();
        verify(historyImport).confirm(userId, file, mapper.valueToTree(selected).toString());
    }

    @Test
    void rejectsRegistrationMismatchBeforeSavingAnything() {
        var request = new SaveAcademicProfileRequest(courseId, curriculumId, 2022, 2, "99999999", null);
        when(profiles.getByUserId(userId)).thenReturn(AcademicProfileView.incomplete());
        when(parser.history(file)).thenReturn(document("FT05", "22350000"));

        assertThrows(ProgressException.class, () -> service().confirm(userId, file, request, List.of()));

        verify(profiles, never()).save(eq(userId), eq(courseId), eq(curriculumId), eq(2022), eq(2), anyString(), eq(null));
        verify(entityManager, never()).flush();
    }

    private EcampusOnboardingService service() {
        return new EcampusOnboardingService(parser, profiles, historyImport, entityManager, mapper);
    }

    private static EcampusDocumentParser.HistoryPreview document(String courseCode, String registration) {
        return new EcampusDocumentParser.HistoryPreview(courseCode, "Estudante Exemplo", registration,
                2022, 2, List.of(), 3195, 0, 480, 0, List.of());
    }
}
