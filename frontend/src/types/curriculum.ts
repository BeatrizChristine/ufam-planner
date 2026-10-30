export type CurriculumSource = {
  url: string;
  title: string;
  version: string | null;
  publishedAt: string | null;
  capturedAt: string;
  trustStatus: "OFFICIAL" | "VALIDATED" | "DRAFT";
  prerequisiteDataAvailable: boolean;
  notes: string | null;
};

export type CurriculumComponent = {
  componentId: string;
  disciplineId: string;
  code: string;
  name: string;
  workloadHours: number;
  suggestedPeriod: number | null;
  type: "MANDATORY" | "ELECTIVE" | "OPTIONAL";
  prerequisiteCodes: string[];
  unlocksCodes: string[];
};

export type CurriculumMap = {
  id: string;
  code: string;
  effectiveFrom: string | null;
  courseCode: string;
  courseName: string;
  totalWorkloadHours: number;
  mandatoryWorkloadHours: number | null;
  electiveWorkloadHours: number | null;
  extensionWorkloadHours: number | null;
  expectedPeriods: number;
  source: CurriculumSource | null;
  components: CurriculumComponent[];
};
