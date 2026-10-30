import type { StudySubject } from "@/types/study";

export function importedEnrollmentTerms(subjects: StudySubject[]) {
  const counts = new Map<string, number>();
  for (const subject of subjects) {
    if (subject.source !== "ECAMPUS_ENROLLMENT") continue;
    const term = subject.academicTerm ?? "Período não informado";
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => {
    if (left === "Período não informado") return 1;
    if (right === "Período não informado") return -1;
    return right.localeCompare(left, "pt-BR");
  })
    .map(([term, count]) => ({ term, count }));
}

export function importedHistoryCount(subjects: StudySubject[], completedCodes: string[]) {
  const codes = new Set(completedCodes.map((code) => code.toUpperCase()));
  for (const subject of subjects) {
    if (subject.source === "ECAMPUS_HISTORY" && subject.status === "COMPLETED") {
      codes.add(subject.code.toUpperCase());
    }
  }
  return codes.size;
}
