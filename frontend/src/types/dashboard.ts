export type DashboardSummary = {
  profileCompleted: boolean;
  studentName: string;
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
  curriculumId: string | null;
  curriculumCode: string | null;
  admissionYear: number | null;
  admissionTerm: number | null;
  currentPeriod: number | null;
  progressAvailable: boolean;
};
