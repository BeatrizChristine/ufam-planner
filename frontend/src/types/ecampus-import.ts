export type ImportedMeeting = { weekday: number; startHour: number };

export type EnrollmentImportSubject = {
  code: string;
  name: string;
  workloadHours: number;
  sectionLabel: string;
  meetings: ImportedMeeting[];
  nameNeedsReview: boolean;
  action: "NEW" | "UPDATE" | "UNCHANGED" | "REVIEW" | "BLOCKED";
  existingId: string | null;
  recordedAbsences: number;
  explanation: string;
  category: "MANDATORY" | "ELECTIVE" | "EXTERNAL_ELECTIVE";
};

export type EnrollmentImportPreview = {
  courseCode: string | null;
  term: string | null;
  studentName: string | null;
  registrationNumber: string | null;
  admissionYear: number | null;
  admissionTerm: number | null;
  subjects: EnrollmentImportSubject[];
  totalWorkloadHours: number;
  warnings: string[];
};

export type EnrollmentImportResult = {
  term: string;
  created: number;
  updated: number;
  unchanged: number;
};

export type HistoryImportSubject = {
  code: string;
  name: string;
  workloadHours: number;
  category: "MANDATORY" | "ELECTIVE";
  result: string;
  nameNeedsReview: boolean;
};

export type HistoryImportPreview = {
  courseCode: string | null;
  studentName: string | null;
  registrationNumber: string | null;
  admissionYear: number | null;
  admissionTerm: number | null;
  completed: HistoryImportSubject[];
  mandatoryRequiredHours: number;
  mandatoryCompletedHours: number;
  electiveRequiredHours: number;
  electiveCompletedHours: number;
  warnings: string[];
};
