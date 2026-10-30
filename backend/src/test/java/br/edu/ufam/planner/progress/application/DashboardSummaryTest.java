package br.edu.ufam.planner.progress.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DashboardSummaryTest {

    @Test
    void shouldRepresentAProfileWithoutInventingProgress() {
        var summary = new DashboardSummary(
                true,
                "João Silva",
                java.util.UUID.randomUUID(),
                "FT05",
                "Engenharia da Computação",
                java.util.UUID.randomUUID(),
                "FT05-DEMO-2024",
                2024,
                1,
                5,
                false);

        assertThat(summary.profileCompleted()).isTrue();
        assertThat(summary.progressAvailable()).isFalse();
        assertThat(summary.courseName()).isNotBlank();
    }
}
