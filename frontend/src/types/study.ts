export type StudyMeeting = { id: string; weekday: number; startHour: number; endHour: number };
export type StudyAbsence = { id: string; missedOn: string; missedHours: number; note: string | null };
export type StudyCourseContext = {
  code: string | null;
  name: string;
  unitName: string | null;
  unitAbbreviation: string | null;
  officialUrl: string | null;
  sourceUrl: string | null;
  relation: "CURRICULUM" | "OFFERING";
};
export type StudySubject = {
  id: string;
  disciplineId: string | null;
  code: string;
  name: string;
  workloadHours: number;
  offeringCourse: string | null;
  sectionLabel: string | null;
  academicTerm: string | null;
  source: "MANUAL" | "ECAMPUS_ENROLLMENT" | "ECAMPUS_HISTORY";
  category: "MANDATORY" | "ELECTIVE" | "EXTERNAL_ELECTIVE";
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  countAsElective: boolean;
  catalogMatched: boolean;
  inCurriculum: boolean;
  courseContext: StudyCourseContext | null;
  meetings: StudyMeeting[];
  absences: StudyAbsence[];
};
export type CatalogDiscipline = { id: string; code: string; name: string; workloadHours: number; department: string | null; gradeCourses: string | null; gradeCourseCount: number };
export type CatalogCoverageLevel = { levelId: number; label: string; courses: number; indexedCourses: number };
export type CatalogCoverage = { courses: number; indexedCourses: number; disciplines: number; levels: CatalogCoverageLevel[] };
export type StudySubjectInput = Omit<StudySubject, "id" | "catalogMatched" | "inCurriculum" | "courseContext" | "absences" | "meetings" | "source" | "academicTerm"> & {
  academicTerm?: string | null;
  meetings: { weekday: number; startHour: number }[];
};
