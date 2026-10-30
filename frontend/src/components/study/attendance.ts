import type { StudySubject } from "@/types/study";

export function attendanceFor(subject: StudySubject) {
  const missedHours = subject.absences.reduce((total, absence) => total + absence.missedHours, 0);
  const limitHours = Math.floor(subject.workloadHours * 0.25);
  const remainingHours = Math.max(0, limitHours - missedHours);
  const missedPercent = subject.workloadHours > 0 ? Math.min(100, missedHours / subject.workloadHours * 100) : 0;
  const remainingTwoHourBlocks = Math.floor(remainingHours / 2);
  const days = Array.from(new Set(subject.meetings.map((meeting) => meeting.weekday))).map((weekday) => {
    const hoursPerDay = subject.meetings.filter((meeting) => meeting.weekday === weekday).reduce((total, meeting) => total + meeting.endHour - meeting.startHour, 0);
    return { weekday, hoursPerDay, fullDaysLeft: Math.floor(remainingHours / hoursPerDay) };
  });
  const state: "EXCEEDED" | "AT_LIMIT" | "WARNING" | "SAFE" =
    missedHours > limitHours ? "EXCEEDED" : missedHours === limitHours ? "AT_LIMIT" : remainingHours <= 4 ? "WARNING" : "SAFE";
  return { missedHours, limitHours, remainingHours, missedPercent, remainingTwoHourBlocks, days, state };
}

export function absenceCapacity(subject: StudySubject, date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  const scheduledHours = subject.meetings.length
    ? subject.meetings.filter((meeting) => meeting.weekday === day)
        .reduce((total, meeting) => total + meeting.endHour - meeting.startHour, 0)
    : 0;
  const recordedHours = subject.absences.filter((absence) => absence.missedOn === date)
    .reduce((total, absence) => total + absence.missedHours, 0);
  return Math.max(0, Math.min(12, scheduledHours - recordedHours));
}

export function latestAvailableClassDate(subject: StudySubject, today: string): string | null {
  if (!subject.meetings.length) return null;
  const cursor = new Date(`${today}T12:00:00Z`);
  // A week per recorded date plus one guarantees a free scheduled date without an unbounded search.
  const recordedDates = new Set(subject.absences.map((absence) => absence.missedOn)).size;
  for (let offset = 0; offset < (recordedDates + 1) * 7; offset++) {
    const date = cursor.toISOString().slice(0, 10);
    if (absenceCapacity(subject, date) > 0) return date;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return null;
}
