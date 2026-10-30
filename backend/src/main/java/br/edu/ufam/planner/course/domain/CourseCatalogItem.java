package br.edu.ufam.planner.course.domain;

import java.util.UUID;

public record CourseCatalogItem(
        UUID id,
        String code,
        String name,
        String campus,
        String degreeType) {
}
