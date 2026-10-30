package br.edu.ufam.planner.schedule.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import br.edu.ufam.planner.progress.application.ProgressException;

import org.junit.jupiter.api.Test;

class EcampusDocumentParserTest {
    @Test
    void rejectedEnrollmentRequestsAreNotAcceptedAsProofOfEnrollment() {
        assertThrows(ProgressException.class, () -> EcampusDocumentParser.parseEnrollment("""
                FT05 FTE030 - LABORATÓRIO DE SISTEMA DE CONTROLE
                Rejeitada por Falta de Vagas CO1 460
                """));
    }

    @Test
    void enrollmentReadsOnlyCurrentClassesAndMeetings() {
        var preview = EcampusDocumentParser.parseEnrollment("""
                Aluno: 22350000 - Estudante Exemplo Versão (Currículo) :
                Ano de Ingresso: 2022/2º Semestre
                Curso: FT05 - Engenharia da Computação
                2009/1
                2026 /2º Semestre
                FTL042 EE-01 ELETRÔNICA DIGITAL II 4 60
                Segunda-feira 08:00 10:00
                Quarta-feira 08:00 10:00
                Docente(s): Exemplo
                FTL044 EE-01A LABORATÓRIO DE ELETRÔNICA DIGITAL 1 30
                Sexta-feira 08:00 10:00
                Total de Créditos e Carga Horária: 5 90
                """);
        assertEquals("FT05", preview.courseCode());
        assertEquals("Estudante Exemplo", preview.studentName());
        assertEquals("22350000", preview.registrationNumber());
        assertEquals(2022, preview.admissionYear());
        assertEquals(2, preview.admissionTerm());
        assertEquals("2026/2", preview.term());
        assertEquals(2, preview.subjects().size());
        assertEquals(2, preview.subjects().get(0).meetings().size());
        assertEquals(90, preview.totalWorkloadHours());
        assertFalse(preview.warnings().stream().anyMatch(warning -> warning.contains("soma")));
    }

    @Test
    void historyKeepsApprovedRetakesAndIgnoresFailuresAndCurrentEnrollments() {
        var preview = EcampusDocumentParser.parseHistory("""
                Ano de Ingresso:
                2022/2º Semestre
                Aluno: 22350000 - Estudante Exemplo
                FT05 - Engenharia da Computação
                OBRIGATÓRIAS
                90IEM011    4.18CALCULO I 6 Repro Nota
                90IEM011    6.51CALCULO I 6 Aprovado
                60IEF038    9.50FISICA II E 4 Disp Nota
                60FTL042 *****ELETRONICA DIGITAL II 4 Matricula
                OPTATIVAS
                60FLI033    9.70MANDARIM I 4 Aprovado
                DISCIPLINAS A VENCER (OBRIGATÓRIAS)
                DISCIPLINAS OBRIGATÓRIAS 3195 150 4,69 % 190 10 5,26 %
                DISCIPLINAS OPTATIVAS 480 60 12,50 % 32 4 12,50 %
                """);
        assertEquals(3, preview.completed().size());
        assertEquals("FT05", preview.courseCode());
        assertEquals("Estudante Exemplo", preview.studentName());
        assertEquals("22350000", preview.registrationNumber());
        assertEquals(2022, preview.admissionYear());
        assertEquals(2, preview.admissionTerm());
        assertEquals("ELECTIVE", preview.completed().get(2).category());
        assertEquals(150, preview.mandatoryCompletedHours());
        assertEquals(60, preview.electiveCompletedHours());
        assertEquals(0, preview.warnings().size());
    }
}
