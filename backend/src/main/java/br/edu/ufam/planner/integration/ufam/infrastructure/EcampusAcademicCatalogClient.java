package br.edu.ufam.planner.integration.ufam.infrastructure;

import java.util.List;

import br.edu.ufam.planner.integration.ufam.application.UfamAcademicCatalogClient;
import br.edu.ufam.planner.integration.ufam.application.UfamCourse;
import br.edu.ufam.planner.integration.ufam.application.UfamCurriculumVersion;
import br.edu.ufam.planner.integration.ufam.application.UfamIntegrationException;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
class EcampusAcademicCatalogClient implements UfamAcademicCatalogClient {

    private static final ParameterizedTypeReference<List<CourseResponse>> COURSE_LIST = new ParameterizedTypeReference<>() { };
    private static final ParameterizedTypeReference<List<CurriculumResponse>> CURRICULUM_LIST = new ParameterizedTypeReference<>() { };

    private final RestClient client;

    EcampusAcademicCatalogClient(
            RestClient.Builder builder,
            @Value("${app.integrations.ufam.ecampus-base-url}") String baseUrl) {
        this.client = builder
                .baseUrl(baseUrl)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public List<UfamCourse> fetchCourses(int levelId) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("nivel_curso", Integer.toString(levelId));
        try {
            var response = client.post()
                    .uri("/gradesCurriculares/loadCursos")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(COURSE_LIST);
            return response == null ? List.of() : response.stream()
                    .map(item -> new UfamCourse(Long.toString(item.id()), item.code().trim(), item.name().trim()))
                    .toList();
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    @Override
    public List<UfamCurriculumVersion> fetchCurriculumVersions(String externalCourseId) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("curso", externalCourseId);
        try {
            var response = client.post()
                    .uri("/gradesCurriculares/loadVersoes")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(CURRICULUM_LIST);
            return response == null ? List.of() : response.stream()
                    .map(item -> new UfamCurriculumVersion(Long.toString(item.id()), item.code().trim(),
                            item.status() == null ? "" : item.status().trim()))
                    .toList();
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private static UfamIntegrationException unavailable(RestClientException cause) {
        return new UfamIntegrationException(
                "ufam_ecampus_unavailable",
                "O catálogo público do eCampus está temporariamente indisponível.",
                cause);
    }

    private record CourseResponse(
            @JsonProperty("IDCURSO") long id,
            @JsonProperty("CODCURSO") String code,
            @JsonProperty("NOMECURSO") String name) {
    }

    private record CurriculumResponse(
            @JsonProperty("ID") long id,
            @JsonProperty("NUMVERSAO") String code,
            @JsonProperty("SITUACAOVERSAO") String status) {
    }
}
