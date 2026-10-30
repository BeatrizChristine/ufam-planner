export type CourseOption = {
  id: string;
  code: string;
  name: string;
  campus: string;
  degreeType: string | null;
  unitName?: string | null;
  unitAbbreviation?: string | null;
  studyShift?: string | null;
  officialUrl?: string | null;
  directorySourceUrl?: string | null;
};

export type CurriculumOption = {
  id: string;
  courseId: string;
  code: string;
  effectiveFrom: string | null;
  totalWorkloadHours: number;
  expectedPeriods: number;
};

export type AcademicProfile = {
  completed: boolean;
  id: string | null;
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
  curriculumId: string | null;
  curriculumCode: string | null;
  admissionYear: number | null;
  admissionTerm: number | null;
  registrationNumber: string | null;
  currentPeriod: number | null;
  updatedAt: string | null;
};

export type SaveAcademicProfile = {
  courseId: string;
  curriculumId: string;
  admissionYear: number;
  admissionTerm: number;
  registrationNumber: string | null;
  currentPeriod: number | null;
};

export type StartAcademicProfile = {
  courseId: string;
  admissionYear: number;
  admissionTerm: number;
  registrationNumber?: string | null;
  currentPeriod?: number | null;
};
