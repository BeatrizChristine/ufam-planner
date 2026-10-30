package br.edu.ufam.planner.integration.ufam.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UfamCatalogSyncServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-24T23:00:00Z");

    @Mock
    UfamAcademicCatalogClient client;

    @Mock
    UfamCatalogStore store;

    UfamCatalogSyncService service;

    @BeforeEach
    void setUp() {
        service = new UfamCatalogSyncService(
                client,
                store,
                Clock.fixed(NOW, ZoneOffset.UTC),
                "https://ecampus.ufam.edu.br/ecampus");
    }

    @Test
    void synchronizesRegularUndergraduateCoursesFromManaus() {
        var syncId = UUID.randomUUID();
        var courses = List.of(new UfamCourse("5925", "IC01", "ABI - Computação"));
        when(store.startSync("courses:level:3", NOW)).thenReturn(syncId);
        when(client.fetchCourses(3)).thenReturn(courses);
        when(store.saveCourses(courses, "Manaus", 3, NOW)).thenReturn(1);

        var result = service.syncCourses(3);

        assertThat(result.itemsProcessed()).isEqualTo(1);
        assertThat(result.resource()).isEqualTo("courses:level:3");
        verify(store).completeSync(syncId, 1, NOW);
    }

    @Test
    void rejectsLevelsOutsideTheConfiguredUndergraduateCatalogs() {
        assertThatThrownBy(() -> service.syncCourses(99))
                .isInstanceOf(UfamIntegrationException.class)
                .hasMessageContaining("não faz parte");
        verifyNoInteractions(client, store);
    }
}
