export function calendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function shiftCalendarMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7);
}

export function classDatesInMonth(month: string, weekdays: number[], maxDate: string) {
  return calendarDays(month).filter((date) => date.slice(0, 7) === month && date <= maxDate
    && weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay() || 7));
}

export function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}
