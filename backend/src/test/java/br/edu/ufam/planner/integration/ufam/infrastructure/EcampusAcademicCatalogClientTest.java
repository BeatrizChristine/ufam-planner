package br.edu.ufam.planner.integration.ufam.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class EcampusAcademicCatalogClientTest {

    @Test
    void acceptsUndatedFutureVersionBeforeCurrentVersion() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new EcampusAcademicCatalogClient(builder, "https://ecampus.ufam.edu.br/ecampus");
        server.expect(requestTo("https://ecampus.ufam.edu.br/ecampus/gradesCurriculares/loadVersoes"))
                .andRespond(withSuccess("""
                        [{"ID":12551,"NUMVERSAO":"2027/1","SITUACAOVERSAO":null},
                         {"ID":8032,"NUMVERSAO":"2021/1","SITUACAOVERSAO":"corrente"}]
                        """, MediaType.APPLICATION_JSON));

        var versions = client.fetchCurriculumVersions("72");

        assertThat(versions).hasSize(2);
        assertThat(versions.get(0).status()).isEmpty();
        assertThat(versions.get(1).status()).isEqualTo("corrente");
        server.verify();
    }
}
