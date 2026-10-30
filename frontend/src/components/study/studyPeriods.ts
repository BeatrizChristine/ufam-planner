import type { StudySubject } from "@/types/study";

export function studyPeriodView(subjects: StudySubject[], selectedTerm: string | null, mode: "SCHEDULE" | "ATTENDANCE") {
  const relevant = subjects.filter((subject) => mode === "ATTENDANCE"
    ? subject.status === "IN_PROGRESS"
    : subject.source !== "ECAMPUS_HISTORY" && subject.status !== "COMPLETED");
  const terms = [...new Set(relevant.map((subject) => subject.academicTerm).filter((term): term is string => Boolean(term)))].sort().reverse();
  const effectiveTerm = selectedTerm && terms.includes(selectedTerm) ? selectedTerm : terms[0] ?? null;
  return {
    terms,
    effectiveTerm,
    unassigned: relevant.filter((subject) => !subject.academicTerm),
    visible: effectiveTerm ? relevant.filter((subject) => subject.academicTerm === effectiveTerm) : [],
  };
}
