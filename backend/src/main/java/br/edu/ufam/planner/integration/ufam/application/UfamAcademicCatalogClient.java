package br.edu.ufam.planner.integration.ufam.application;

import java.util.List;

public interface UfamAcademicCatalogClient {

    List<UfamCourse> fetchCourses(int levelId);

    List<UfamCurriculumVersion> fetchCurriculumVersions(String externalCourseId);
}
