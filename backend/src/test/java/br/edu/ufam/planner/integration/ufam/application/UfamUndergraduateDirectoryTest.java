package br.edu.ufam.planner.integration.ufam.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

class UfamUndergraduateDirectoryTest {
    private static final Instant NOW = Instant.parse("2026-09-28T16:00:00Z");

    private Document page() {
        return Jsoup.parse("""
            <table>
              <tr><th>Nome da Unidade Acadêmica</th><th>Sigla</th><th>Código do Curso</th><th>Curso</th></tr>
              <tr><td rowspan="3"><a href="https://ft.ufam.edu.br/">Faculdade de Tecnologia</a></td>
                  <td rowspan="3">FT</td><td>FT05</td>
                  <td><a href="https://engcomp.ufam.edu.br/">Engenharia da Computação (Integral)</a></td></tr>
              <tr><td>FT02-E</td><td>Engenharia Elétrica (Diurno)</td></tr>
              <tr><td>FT02-ET</td><td><a href="https://ufam.edu.br.evil.invalid/">Engenharia Elétrica (Noturno)</a></td></tr>
              <tr><td>Instituto de Computação</td><td>ICOMP</td><td>IC01</td><td>ABI - Computação (Integral)</td></tr>
              <tr><td>IC01</td><td>Duplicata</td></tr>
            </table>
            <table><tr><td>FA99</td><td>Não é a tabela oficial</td></tr></table>
            """, UfamUndergraduateDirectory.SOURCE_URL);
    }

    @Test
    void parsesOfficialCodesIncludingMergedUnitCellsAndDistinctElectricalCourses() {
        var courses = UfamUndergraduateDirectory.parse(page());
        assertThat(courses).extracting(UfamUndergraduateDirectory.Course::code)
                .containsExactly("FT05", "FT02-E", "FT02-ET", "IC01");
        var computing = courses.get(0);
        assertThat(computing.name()).isEqualTo("Engenharia da Computação");
        assertThat(computing.shift()).isEqualTo("Integral");
        assertThat(computing.unitName()).isEqualTo("Faculdade de Tecnologia");
        assertThat(computing.unitAbbreviation()).isEqualTo("FT");
        assertThat(computing.officialUrl()).isEqualTo("https://engcomp.ufam.edu.br/");
        assertThat(courses.get(1).unitName()).isEqualTo(computing.unitName());
        assertThat(courses.get(1).officialUrl()).isEqualTo("https://ft.ufam.edu.br/");
        assertThat(courses.get(2).officialUrl()).isEqualTo("https://ft.ufam.edu.br/");
        assertThat(courses.get(3).officialUrl()).isEqualTo(UfamUndergraduateDirectory.SOURCE_URL);
    }

    @Test
    void cachesDirectoryAndMatchesOnlyExactCourseCodes() {
        var calls = new AtomicInteger();
        var service = new UfamUndergraduateDirectory(Clock.fixed(NOW, ZoneOffset.UTC), () -> {
            calls.incrementAndGet();
            return page();
        });
        assertThat(service.find(" ft05 ")).isPresent();
        assertThat(service.find("FT02")).isEmpty();
        assertThat(service.find("EE-01")).isEmpty();
        assertThat(service.catalog().available()).isTrue();
        assertThat(service.catalog().refreshedAt()).isEqualTo(NOW);
        assertThat(calls).hasValue(1);
    }

    @Test
    void retainsSuccessfulSnapshotWhenUniversitySiteIsUnavailable() {
        var clock = mock(Clock.class);
        when(clock.instant()).thenReturn(NOW);
        var calls = new AtomicInteger();
        var service = new UfamUndergraduateDirectory(clock, () -> {
            if (calls.incrementAndGet() > 1) throw new IOException("upstream outage");
            return page();
        });
        var snapshot = service.catalog();
        when(clock.instant()).thenReturn(NOW.plusSeconds(86401));
        assertThat(service.catalog()).isEqualTo(snapshot);
        assertThat(service.find("FT05")).isPresent();
        assertThat(calls).hasValue(2);
    }

    @Test
    void firstOutageReturnsEmptyMetadataAndThrottlesRetriesInsteadOfBreakingApp() {
        var calls = new AtomicInteger();
        var service = new UfamUndergraduateDirectory(Clock.fixed(NOW, ZoneOffset.UTC), () -> {
            calls.incrementAndGet();
            throw new IOException("upstream outage");
        });
        assertThat(service.catalog().available()).isFalse();
        assertThat(service.find("FT05")).isEmpty();
        assertThat(calls).hasValue(1);
    }

    @Test
    void structuralChangesDoNotProduceFabricatedCourses() {
        assertThat(UfamUndergraduateDirectory.parse(Jsoup.parse("<table><tr><td>FT05</td><td>Fake</td></tr></table>"))).isEmpty();
    }
}
