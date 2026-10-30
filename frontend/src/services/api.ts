import type { DashboardSummary } from "@/types/dashboard";
import type { CurriculumMap } from "@/types/curriculum";
import type { AcademicProfile, CourseOption, CurriculumOption, SaveAcademicProfile, StartAcademicProfile } from "@/types/profile";
import type { CatalogCoverage, CatalogDiscipline, StudyAbsence, StudySubject, StudySubjectInput } from "@/types/study";
import type { EnrollmentImportPreview, EnrollmentImportResult, HistoryImportPreview } from "@/types/ecampus-import";
import { apiFetch } from "./api-client";

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/dashboard/summary", { signal });
}

export async function getCurriculumMap(curriculumId: string, signal?: AbortSignal): Promise<CurriculumMap> {
  return apiFetch<CurriculumMap>(`/curricula/${curriculumId}/map`, { signal });
}

export type CompletedDisciplines = { completedCodes: string[] };

export const progressApi = {
  completed(signal?: AbortSignal) {
    return apiFetch<CompletedDisciplines>("/progress/me/completed", { signal });
  },

  setCompleted(disciplineId: string, completed: boolean) {
    return apiFetch<CompletedDisciplines>(`/progress/me/disciplines/${disciplineId}`, {
      method: "PUT",
      body: JSON.stringify({ completed }),
    });
  },
};

export const studyApi = {
  catalogCoverage(signal?: AbortSignal) {
    return apiFetch<CatalogCoverage>("/study/catalog/coverage", { signal });
  },
  subjects(signal?: AbortSignal) {
    return apiFetch<StudySubject[]>("/study/me/subjects", { signal });
  },
  searchDisciplines(query: string, signal?: AbortSignal, levelId = 0) {
    return apiFetch<CatalogDiscipline[]>(`/study/catalog/disciplines?query=${encodeURIComponent(query)}&levelId=${levelId}`, { signal });
  },
  importCourseDisciplines(courseId: string) {
    return apiFetch<CatalogDiscipline[]>(`/study/catalog/courses/${courseId}/disciplines/import`, { method: "POST" });
  },
  saveSubject(payload: StudySubjectInput, id?: string) {
    return apiFetch<StudySubject>(id ? `/study/me/subjects/${id}` : "/study/me/subjects", {
      method: id ? "PUT" : "POST", body: JSON.stringify(payload),
    });
  },
  deleteSubject(id: string) {
    return apiFetch<void>(`/study/me/subjects/${id}`, { method: "DELETE" });
  },
  addAbsence(id: string, missedOn: string, missedHours: number, note?: string) {
    return apiFetch<StudyAbsence>(`/study/me/subjects/${id}/absences`, {
      method: "POST", body: JSON.stringify({ missedOn, missedHours, note }),
    });
  },
  deleteAbsence(id: string, absenceId: string) {
    return apiFetch<void>(`/study/me/subjects/${id}/absences/${absenceId}`, { method: "DELETE" });
  },
};

export const ecampusImportApi = {
  enrollment(file: File) {
    const body = new FormData();
    body.append("file", file);
    return apiFetch<EnrollmentImportPreview>("/study/import/enrollment/preview", { method: "POST", body });
  },
  confirmEnrollment(file: File, selection: { code: string; sectionLabel: string; name: string; associateId: string | null }[]) {
    const body = new FormData();
    body.append("file", file);
    body.append("selection", JSON.stringify(selection));
    return apiFetch<EnrollmentImportResult>("/study/import/enrollment/confirm", { method: "POST", body });
  },
  history(file: File) {
    const body = new FormData();
    body.append("file", file);
    return apiFetch<HistoryImportPreview>("/study/import/history/preview", { method: "POST", body });
  },
  confirmHistory(file: File, selection: { code: string; name: string }[]) {
    const body = new FormData();
    body.append("file", file);
    body.append("selection", JSON.stringify(selection));
    return apiFetch<{ added: number; unchanged: number; completedCodes: string[] }>(
      "/study/import/history/confirm", { method: "POST", body });
  },
  onboardWithHistory(file: File, profile: SaveAcademicProfile, selection: { code: string; name: string }[]) {
    const body = new FormData();
    body.append("file", file);
    body.append("request", new Blob([JSON.stringify({ profile, selection })], { type: "application/json" }));
    return apiFetch<{ profile: AcademicProfile; added: number; unchanged: number }>(
      "/study/import/history/onboard", { method: "POST", body });
  },
};

export const academicProfileApi = {
  get(signal?: AbortSignal) {
    return apiFetch<AcademicProfile>("/academic-profile/me", { signal });
  },

  save(payload: SaveAcademicProfile) {
    return apiFetch<AcademicProfile>("/academic-profile/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  start(payload: StartAcademicProfile) {
    return apiFetch<AcademicProfile>("/academic-profile/me/course", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  courses(signal?: AbortSignal) {
    return apiFetch<CourseOption[]>("/catalog/courses", { signal });
  },

  curricula(courseId: string, signal?: AbortSignal) {
    return apiFetch<CurriculumOption[]>(`/catalog/courses/${courseId}/curricula`, { signal });
  },
};
