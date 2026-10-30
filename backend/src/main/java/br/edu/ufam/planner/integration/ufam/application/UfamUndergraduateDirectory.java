package br.edu.ufam.planner.integration.ufam.application;

import java.io.IOException;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Enriches eCampus codes without guessing which course offers a specific class. */
@Service
public class UfamUndergraduateDirectory {
    public static final String SOURCE_URL = "https://www.ufam.edu.br/graduacao.html";
    private static final Logger LOG = LoggerFactory.getLogger(UfamUndergraduateDirectory.class);
    private static final Pattern CODE = Pattern.compile("[A-Z]{2,3}\\d{2}(?:-[A-Z]+)?");
    private static final Pattern SHIFT = Pattern.compile("^(.*?)\\s*\\(([^()]*)\\)\\s*$");
    private final Clock clock;
    private final PageLoader loader;
    private Snapshot cached = new Snapshot(false, SOURCE_URL, null, List.of());
    private Instant retryAt = Instant.EPOCH;

    public UfamUndergraduateDirectory() {
        this(Clock.systemUTC(), () -> Jsoup.connect(SOURCE_URL)
                .userAgent("UFAMPlanner/0.1 (public undergraduate directory)")
                .timeout(6000).maxBodySize(2_000_000).get());
    }

    UfamUndergraduateDirectory(Clock clock, PageLoader loader) {
        this.clock = clock;
        this.loader = loader;
    }

    public record Course(String code, String name, String unitName, String unitAbbreviation,
            String shift, String officialUrl, String sourceUrl) {}
    public record Snapshot(boolean available, String sourceUrl, Instant refreshedAt, List<Course> courses) {}
    @FunctionalInterface interface PageLoader { Document load() throws IOException; }

    public synchronized Snapshot catalog() {
        Instant now = clock.instant();
        if (now.isBefore(retryAt)) return cached;
        try {
            List<Course> courses = parse(loader.load());
            if (courses.isEmpty()) throw new IOException("No undergraduate table found");
            cached = new Snapshot(true, SOURCE_URL, now, courses);
            retryAt = now.plus(Duration.ofHours(24));
        } catch (IOException | RuntimeException exception) {
            // A public-site outage must never prevent login, schedule or profile access.
            retryAt = now.plus(Duration.ofMinutes(5));
            LOG.warn("UFAM undergraduate directory unavailable; retaining cached metadata.");
        }
        return cached;
    }

    public Optional<Course> find(String code) {
        if (code == null) return Optional.empty();
        return catalog().courses().stream().filter(course -> course.code().equalsIgnoreCase(code.trim())).findFirst();
    }

    static List<Course> parse(Document document) {
        Map<String, Course> courses = new LinkedHashMap<>();
        for (Element table : document.select("table")) {
            if (!table.text().contains("Código do Curso") || !table.text().contains("Nome da Unidade")) continue;
            String unit = null, abbreviation = null, unitUrl = null;
            for (Element row : table.select("tr")) {
                List<Element> cells = row.children().stream().filter(cell -> cell.tagName().equals("td") || cell.tagName().equals("th")).toList();
                if (cells.size() < 2) continue;
                Element codeCell = cells.get(cells.size() - 2);
                String code = text(codeCell).toUpperCase(Locale.ROOT);
                if (!CODE.matcher(code).matches()) continue;
                if (cells.size() >= 4) {
                    unit = text(cells.get(0));
                    abbreviation = text(cells.get(1));
                    unitUrl = officialLink(cells.get(0));
                }
                if (unit == null || abbreviation == null) continue;
                Element nameCell = cells.get(cells.size() - 1);
                String name = text(nameCell), shift = null;
                var matcher = SHIFT.matcher(name);
                if (matcher.matches()) { name = matcher.group(1).trim(); shift = matcher.group(2).trim(); }
                String url = officialLink(nameCell);
                if (url == null) url = unitUrl == null ? SOURCE_URL : unitUrl;
                courses.putIfAbsent(code, new Course(code, name, unit, abbreviation, shift, url, SOURCE_URL));
            }
        }
        return List.copyOf(new ArrayList<>(courses.values()));
    }

    private static String text(Element cell) { return cell.text().replace('\u00a0', ' ').strip().replaceAll("\\s+", " "); }

    private static String officialLink(Element cell) {
        for (Element link : cell.select("a[href]")) {
            try {
                URI uri = URI.create(link.absUrl("href"));
                String host = uri.getHost();
                if (host != null && (host.equalsIgnoreCase("ufam.edu.br") || host.toLowerCase(Locale.ROOT).endsWith(".ufam.edu.br"))
                        && ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) return uri.toString();
            } catch (IllegalArgumentException ignored) { /* Reject malformed public links. */ }
        }
        return null;
    }
}
