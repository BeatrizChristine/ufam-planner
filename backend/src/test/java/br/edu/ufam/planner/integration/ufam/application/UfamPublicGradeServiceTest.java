package br.edu.ufam.planner.integration.ufam.application;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UfamPublicGradeServiceTest {

    @Test
    void readsDisciplineCodeNameAndTotalHoursWithoutTreatingPrerequisitesAsHours() {
        var rows = UfamPublicGradeService.parseText("""
                PERÍODO CÓD. NOME DA DISCIPLINA CRÉD. TEOR. PRAT. EXTE. TOTAL PRÉ-REQUISITO
                OBRIGATÓRIAS
                1 IEM011 CALCULO I 6 90 90
                2 IEM021 CALCULO II 6 90 90 IEM011 BLOCO 1
                3 IEM141 EQUAÇÕES DIFERENCIAIS ORDINÁRIAS 4 60 60 IEM021 BLOCO 1
                3 XYZ123 MANDARIM 1 4 60 60
                TOTAL GERAL 300
                """);

        assertEquals(4, rows.size());
        assertEquals("CALCULO I", rows.get(0).name());
        assertEquals(90, rows.get(1).workloadHours());
        assertEquals("MANDARIM 1", rows.get(3).name());
        assertEquals(60, rows.get(3).workloadHours());
    }

    @Test
    void repairsMisdecodedAccentsFoundInPublicPdf() {
        var rows = UfamPublicGradeService.parseText("1 IEM012 \u00c3\u0081lgebra Linear I 4 60 60");
        assertEquals("Álgebra Linear I", rows.get(0).name());
    }
}
