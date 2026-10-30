package br.edu.ufam.planner.schedule.application;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import br.edu.ufam.planner.progress.application.ProgressException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class EcampusDocumentParser {
    private static final int MAX_BYTES = 3_000_000;
    private static final Pattern ENROLLMENT_ROW = Pattern.compile(
            "^([A-Z]{2,5}\\d{2,4})\\s+([A-Z0-9-]{2,20})\\s+(.+?)\\s+\\d{1,2}\\s+(\\d{2,3})$");
    private static final Pattern MEETING_ROW = Pattern.compile(
            "^([^\\s]+?)(?:-feira)?\\s+(\\d{2}):(\\d{2})\\s+(\\d{2}):(\\d{2})$");
    private static final Pattern HISTORY_ROW = Pattern.compile(
            "^(\\d{2,3})([A-Z]{2,5}\\d{2,4})\\s+(?:\\*{5}|\\d{1,2}\\.\\d{2})(.+?)\\s+(\\d{1,2})\\s+(Aprovado|Disp Nota|Repro Nota|Matricula)$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern TERM = Pattern.compile("\\b(20\\d{2})\\s*/\\s*([12])");
    private static final Pattern COURSE = Pattern.compile("(?m)^Curso:\\s*([A-Z]{2,5}\\d{2,4})\\b");
    private static final Pattern HISTORY_COURSE = Pattern.compile("(?m)^([A-Z]{2,5}\\d{2,4})\\s+-\\s+[^\\r\\n]+$");
    private static final Pattern STUDENT = Pattern.compile("(?m)^Aluno:\\s*([0-9]{6,15})\\s*-\\s*([^\\r\\n]+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern ADMISSION = Pattern.compile("(?is)Ano\\s+de\\s+Ingresso\\s*:\\s*(20\\d{2})\\s*/\\s*([12])");
    private static final Pattern TOTAL_HOURS = Pattern.compile("^Total de Cr.*?:\\s*\\d+\\s+(\\d+)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUMMARY = Pattern.compile("^DISCIPLINAS (OBRIGAT.*?|OPTATIVAS)\\s+(\\d+)\\s+(\\d+)\\s+[\\d,.]+\\s*%.*$", Pattern.CASE_INSENSITIVE);

    public record Meeting(int weekday, int startHour) {}
    public record EnrollmentSubject(String code, String name, int workloadHours, String sectionLabel,
            List<Meeting> meetings, boolean nameNeedsReview) {}
    public record EnrollmentPreview(String courseCode, String term, String studentName, String registrationNumber,
            Integer admissionYear, Integer admissionTerm, List<EnrollmentSubject> subjects,
            int totalWorkloadHours, List<String> warnings) {}
    public record HistorySubject(String code, String name, int workloadHours, String category,
            String result, boolean nameNeedsReview) {}
    public record HistoryPreview(String courseCode, String studentName, String registrationNumber,
            Integer admissionYear, Integer admissionTerm, List<HistorySubject> completed,
            int mandatoryRequiredHours, int mandatoryCompletedHours,
            int electiveRequiredHours, int electiveCompletedHours, List<String> warnings) {}
    private record StudentMetadata(String name, String registrationNumber, Integer admissionYear, Integer admissionTerm) {}

    public EnrollmentPreview enrollment(MultipartFile file) {
        return parseEnrollment(readPdf(file));
    }

    public HistoryPreview history(MultipartFile file) {
        return parseHistory(readPdf(file));
    }

    private String readPdf(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES)
            throw invalid("Envie um PDF de até 3 MB exportado do eCampus.");
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < 4 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F')
                throw invalid("O arquivo enviado não é um PDF válido.");
            try (PDDocument document = Loader.loadPDF(bytes)) {
                if (document.getNumberOfPages() < 1 || document.getNumberOfPages() > 15)
                    throw invalid("O PDF possui um número de páginas inesperado.");
                String text = new PDFTextStripper().getText(document);
                if (text.length() > 250_000) throw invalid("O PDF contém texto demais para importar.");
                return text;
            }
        } catch (IOException exception) {
            throw invalid("Não foi possível ler este PDF. Exporte-o novamente do eCampus.");
        }
    }

    static EnrollmentPreview parseEnrollment(String text) {
        Map<String, DraftEnrollment> found = new LinkedHashMap<>();
        DraftEnrollment current = null;
        Integer declaredTotal = null;
        for (String raw : text.split("\\R")) {
            String line = raw.strip();
            Matcher row = ENROLLMENT_ROW.matcher(line);
            if (row.matches()) {
                int hours = Integer.parseInt(row.group(4));
                if (hours < 15 || hours > 600) continue;
                String key = row.group(1) + ":" + row.group(2);
                current = found.computeIfAbsent(key,
                        ignored -> new DraftEnrollment(row.group(1), row.group(3).trim(), hours, row.group(2)));
                continue;
            }
            Matcher meeting = MEETING_ROW.matcher(line);
            if (meeting.matches() && current != null) {
                int weekday = weekday(meeting.group(1));
                int start = Integer.parseInt(meeting.group(2));
                int end = Integer.parseInt(meeting.group(4));
                if (weekday > 0 && meeting.group(3).equals("00") && meeting.group(5).equals("00")
                        && end == start + 2 && List.of(8, 10, 14, 16, 18, 20).contains(start)) {
                    Meeting slot = new Meeting(weekday, start);
                    if (!current.meetings.contains(slot)) current.meetings.add(slot);
                }
                continue;
            }
            Matcher total = TOTAL_HOURS.matcher(line);
            if (total.matches()) declaredTotal = Integer.parseInt(total.group(1));
        }
        if (found.isEmpty()) throw invalid("Nenhuma disciplina com turma e carga horária foi encontrada no comprovante.");
        List<EnrollmentSubject> subjects = found.values().stream().map(draft -> new EnrollmentSubject(
                draft.code, draft.name, draft.hours, draft.section, List.copyOf(draft.meetings),
                draft.name.contains("\uFFFD"))).toList();
        int sum = subjects.stream().mapToInt(EnrollmentSubject::workloadHours).sum();
        List<String> warnings = new ArrayList<>();
        if (declaredTotal != null && declaredTotal != sum)
            warnings.add("A soma das disciplinas não bate com a carga horária total do comprovante. Confira antes de importar.");
        if (subjects.stream().anyMatch(subject -> subject.meetings().isEmpty()))
            warnings.add("Uma ou mais disciplinas não tiveram horários reconhecidos.");
        Matcher course = COURSE.matcher(text);
        Matcher term = TERM.matcher(text);
        String currentTerm = null;
        while (term.find()) currentTerm = term.group(1) + "/" + term.group(2);
        StudentMetadata metadata = studentMetadata(text);
        return new EnrollmentPreview(course.find() ? course.group(1) : null,
                currentTerm, metadata.name(), metadata.registrationNumber(), metadata.admissionYear(), metadata.admissionTerm(),
                subjects, sum, warnings);
    }

    static HistoryPreview parseHistory(String text) {
        Map<String, HistorySubject> approved = new LinkedHashMap<>();
        String section = null;
        int mandatoryRequired = 0, mandatoryCompleted = 0, electiveRequired = 0, electiveCompleted = 0;
        for (String raw : text.split("\\R")) {
            String line = raw.strip();
            String upper = line.toUpperCase(Locale.ROOT);
            if (upper.startsWith("OBRIGAT") || upper.startsWith("DISCIPLINAS OBRIGAT")) section = "MANDATORY";
            else if (upper.equals("OPTATIVAS")) section = "ELECTIVE";
            else if (upper.startsWith("DISCIPLINAS A VENCER")) section = null;

            Matcher summary = SUMMARY.matcher(line);
            if (summary.matches()) {
                if (summary.group(1).toUpperCase(Locale.ROOT).startsWith("OBRIGAT")) {
                    mandatoryRequired = Integer.parseInt(summary.group(2));
                    mandatoryCompleted = Integer.parseInt(summary.group(3));
                } else {
                    electiveRequired = Integer.parseInt(summary.group(2));
                    electiveCompleted = Integer.parseInt(summary.group(3));
                }
                continue;
            }
            if (section == null) continue;
            Matcher row = HISTORY_ROW.matcher(line);
            if (!row.matches() || !(row.group(5).equalsIgnoreCase("Aprovado") || row.group(5).equalsIgnoreCase("Disp Nota"))) continue;
            String name = row.group(3).trim();
            approved.putIfAbsent(row.group(2), new HistorySubject(row.group(2), name,
                    Integer.parseInt(row.group(1)), section, row.group(5), name.contains("\uFFFD")));
        }
        if (approved.isEmpty()) throw invalid("Nenhuma disciplina concluída foi encontrada no histórico.");
        Matcher course = COURSE.matcher(text);
        Matcher fallbackCourse = HISTORY_COURSE.matcher(text);
        List<String> warnings = new ArrayList<>();
        if (mandatoryRequired == 0 || electiveRequired == 0)
            warnings.add("Os totais oficiais de carga horária não foram identificados neste histórico.");
        int parsedMandatory = approved.values().stream().filter(item -> item.category().equals("MANDATORY"))
                .mapToInt(HistorySubject::workloadHours).sum();
        int parsedElective = approved.values().stream().filter(item -> item.category().equals("ELECTIVE"))
                .mapToInt(HistorySubject::workloadHours).sum();
        if (mandatoryCompleted > 0 && parsedMandatory != mandatoryCompleted)
            warnings.add("A soma das aprovações obrigatórias difere do total oficial. Revise as disciplinas antes de importar.");
        if (electiveCompleted > 0 && parsedElective != electiveCompleted)
            warnings.add("A soma das optativas difere do total oficial. Revise as disciplinas antes de importar.");
        String courseCode = course.find() ? course.group(1) : fallbackCourse.find() ? fallbackCourse.group(1) : null;
        StudentMetadata metadata = studentMetadata(text);
        return new HistoryPreview(courseCode, metadata.name(), metadata.registrationNumber(),
                metadata.admissionYear(), metadata.admissionTerm(), List.copyOf(approved.values()),
                mandatoryRequired, mandatoryCompleted, electiveRequired, electiveCompleted, warnings);
    }

    private static StudentMetadata studentMetadata(String text) {
        Matcher student = STUDENT.matcher(text);
        String name = null;
        String registration = null;
        if (student.find()) {
            registration = student.group(1);
            name = student.group(2).replaceFirst("(?i)\\s+Vers.o\\s*\\(Curr.culo\\).*$", "").strip();
            if (name.isBlank() || name.length() > 120) name = null;
        }
        Matcher admission = ADMISSION.matcher(text);
        Integer year = null;
        Integer term = null;
        if (admission.find()) {
            year = Integer.parseInt(admission.group(1));
            term = Integer.parseInt(admission.group(2));
        }
        return new StudentMetadata(name, registration, year, term);
    }

    private static int weekday(String value) {
        String day = value.toLowerCase(Locale.ROOT);
        if (day.startsWith("seg")) return 1;
        if (day.startsWith("ter")) return 2;
        if (day.startsWith("qua")) return 3;
        if (day.startsWith("qui")) return 4;
        if (day.startsWith("sex")) return 5;
        if (day.startsWith("sáb") || day.startsWith("sab")) return 6;
        return 0;
    }

    private static ProgressException invalid(String message) {
        return new ProgressException(HttpStatus.BAD_REQUEST, "invalid_ecampus_pdf", message);
    }

    private static class DraftEnrollment {
        final String code;
        final String name;
        final int hours;
        final String section;
        final List<Meeting> meetings = new ArrayList<>();

        DraftEnrollment(String code, String name, int hours, String section) {
            this.code = code;
            this.name = name;
            this.hours = hours;
            this.section = section;
        }
    }
}
