package br.edu.ufam.planner.integration.ufam.application;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Imports only identifiable discipline rows from the public, current eCampus grade. */
@Service
public class UfamPublicGradeService {
    private static final Pattern ROW = Pattern.compile("^(?:[1-9]|1[0-9])\\s+([A-Z]{2,5}\\d{2,4})\\s+(.+)$");
    private static final Pattern NUMBER = Pattern.compile("\\d{1,3}");
    private static final int MAX_REPORT_BYTES = 5_000_000;

    private final JdbcTemplate jdbc;
    private final UfamAcademicCatalogClient catalog;
    private final RestClient client;

    public UfamPublicGradeService(JdbcTemplate jdbc, UfamAcademicCatalogClient catalog,
            RestClient.Builder builder, @Value("${app.integrations.ufam.ecampus-base-url}") String baseUrl) {
        this.jdbc = jdbc;
        this.catalog = catalog;
        this.client = builder.baseUrl(baseUrl).build();
    }

    public record ImportedDiscipline(UUID id, String code, String name, int workloadHours, String department) {}
    record ParsedDiscipline(String code, String name, int workloadHours) {}

    @Transactional
    public List<ImportedDiscipline> importCurrentGrade(UUID courseId) {
        record CourseSource(String externalId, int levelId) {}
        List<CourseSource> sources = jdbc.query("""
                SELECT external_id, ufam_level_id FROM course WHERE id = ? AND active = true
                AND source = 'UFAM_ECAMPUS' AND external_id IS NOT NULL AND ufam_level_id IS NOT NULL
                """, (rs, row) -> new CourseSource(rs.getString(1), rs.getInt(2)), courseId);
        if (sources.isEmpty())
            throw new UfamIntegrationException("course_not_found", "Este curso não possui uma grade pública integrada.");

        var source = sources.get(0);
        var versions = catalog.fetchCurriculumVersions(source.externalId());
        var current = versions.stream().filter(version -> "corrente".equalsIgnoreCase(version.status())).findFirst()
                .orElseThrow(() -> new UfamIntegrationException("grade_not_found",
                        "Não foi encontrada uma versão corrente da grade pública deste curso."));

        var form = new LinkedMultiValueMap<String, String>();
        form.add("nivel_curso", Integer.toString(source.levelId()));
        form.add("curso", source.externalId());
        form.add("versao", current.externalId());
        byte[] pdf;
        try {
            pdf = client.post().uri("/gradesCurriculares/report")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_PDF)
                    .body(form).retrieve().body(byte[].class);
        } catch (RestClientException exception) {
            throw new UfamIntegrationException("ufam_ecampus_unavailable",
                    "Não foi possível consultar a grade pública da UFAM agora.", exception);
        }
        if (pdf == null || pdf.length < 4 || pdf.length > MAX_REPORT_BYTES
                || pdf[0] != '%' || pdf[1] != 'P' || pdf[2] != 'D' || pdf[3] != 'F')
            throw new UfamIntegrationException("invalid_grade_report", "A UFAM não retornou uma grade em PDF válida.");

        List<ParsedDiscipline> parsed;
        try (PDDocument document = Loader.loadPDF(pdf)) {
            if (document.getNumberOfPages() > 30)
                throw new UfamIntegrationException("invalid_grade_report", "A grade retornada é grande demais para importar.");
            parsed = parseText(new PDFTextStripper().getText(document));
        } catch (IOException exception) {
            throw new UfamIntegrationException("invalid_grade_report", "Não foi possível ler a grade pública da UFAM.", exception);
        }
        if (parsed.isEmpty())
            throw new UfamIntegrationException("invalid_grade_report", "Nenhuma disciplina pôde ser identificada nessa grade.");

        List<ImportedDiscipline> imported = new ArrayList<>();
        for (var item : parsed) {
            jdbc.update("""
                    INSERT INTO discipline (id, code, name, workload_hours, active, source, external_id, synced_at)
                    VALUES (?, ?, ?, ?, true, 'UFAM_ECAMPUS', ?, ?)
                    ON CONFLICT (code) DO UPDATE SET
                        name = EXCLUDED.name, synced_at = EXCLUDED.synced_at
                    WHERE discipline.source = 'UFAM_ECAMPUS'
                    """, UUID.randomUUID(), item.code(), item.name(), item.workloadHours(),
                    item.code(), java.sql.Timestamp.from(Instant.now()));
            imported.addAll(jdbc.query("""
                    SELECT id, code, name, workload_hours, department FROM discipline
                    WHERE code = ? AND active = true
                    """, (rs, row) -> new ImportedDiscipline((UUID) rs.getObject("id"), rs.getString("code"),
                    rs.getString("name"), rs.getInt("workload_hours"), rs.getString("department")), item.code()));
        }
        jdbc.update("DELETE FROM public_grade_course_discipline WHERE course_id = ?", courseId);
        for (var item : imported) {
            jdbc.update("""
                    INSERT INTO public_grade_course_discipline (course_id, discipline_id, version_code)
                    VALUES (?, ?, ?)
                    """, courseId, item.id(), current.code());
        }
        jdbc.update("""
                INSERT INTO public_grade_course_sync
                    (course_id, status, attempted_at, synced_at, version_code, discipline_count)
                VALUES (?, 'SUCCESS', NOW(), NOW(), ?, ?)
                ON CONFLICT (course_id) DO UPDATE SET
                    status = 'SUCCESS', attempted_at = NOW(), synced_at = NOW(),
                    version_code = EXCLUDED.version_code,
                    discipline_count = EXCLUDED.discipline_count, error_message = NULL
                """, courseId, current.code(), imported.size());
        return imported;
    }

    static List<ParsedDiscipline> parseText(String text) {
        Map<String, ParsedDiscipline> items = new LinkedHashMap<>();
        for (String line : text.split("\\R")) {
            Matcher row = ROW.matcher(line.strip());
            if (!row.matches()) continue;
            String[] tokens = row.group(2).trim().split("\\s+");
            for (int i = 1; i < tokens.length - 1; i++) {
                if (!NUMBER.matcher(tokens[i]).matches() || !NUMBER.matcher(tokens[i + 1]).matches()) continue;
                int credits = Integer.parseInt(tokens[i]);
                int firstHours = Integer.parseInt(tokens[i + 1]);
                if (credits < 1 || credits > 12 || firstHours % 15 != 0 || firstHours > 180) continue;
                int lastNumeric = i + 1;
                while (lastNumeric + 1 < tokens.length && NUMBER.matcher(tokens[lastNumeric + 1]).matches()) lastNumeric++;
                int totalHours = Integer.parseInt(tokens[lastNumeric]);
                if (totalHours < 15 || totalHours > 600) continue;
                String name = repairName(String.join(" ", java.util.Arrays.copyOfRange(tokens, 0, i)).trim());
                if (name.length() < 3 || name.length() > 180) continue;
                items.putIfAbsent(row.group(1), new ParsedDiscipline(row.group(1), name, totalHours));
                break;
            }
        }
        return List.copyOf(items.values());
    }

    private static String repairName(String name) {
        // Some eCampus PDFs expose UTF-8 bytes as Latin-1 characters ("CÃ¡lculo").
        if (!name.contains("\u00c3") && !name.contains("\u00c2")) return name;
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(name.getBytes(StandardCharsets.ISO_8859_1))).toString();
        } catch (CharacterCodingException exception) {
            return name;
        }
    }
}
