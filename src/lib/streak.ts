export type StudyDay = {
  day: string;
  questionIds: string[];
  sujetIds: string[];
};

export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDay(day: string, amount: number) {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  const shifted = new Date(year, month - 1, date, 12);
  shifted.setDate(shifted.getDate() + amount);
  return localDayKey(shifted);
}

export function summarizeStudyDays(studyDays: StudyDay[], today = localDayKey()) {
  const byDay = new Map(studyDays.map((entry) => [entry.day, entry]));
  const activeDays = new Set(byDay.keys());
  const orderedDays = [...activeDays].sort();
  let longestStreak = 0;
  let run = 0;
  let previous: string | undefined;

  for (const day of orderedDays) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  let currentStreak = 0;
  let anchor = activeDays.has(today) ? today : shiftDay(today, -1);
  while (activeDays.has(anchor)) {
    currentStreak++;
    anchor = shiftDay(anchor, -1);
  }

  const week = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(today, index - 6);
    const entry = byDay.get(day);
    return {
      day,
      active: !!entry,
      questions: entry?.questionIds.length ?? 0,
      sujets: entry?.sujetIds.length ?? 0,
    };
  });

  return {
    activeDays: activeDays.size,
    currentStreak,
    longestStreak,
    activeToday: activeDays.has(today),
    todayQuestions: byDay.get(today)?.questionIds.length ?? 0,
    totalQuestions: studyDays.reduce((total, entry) => total + entry.questionIds.length, 0),
    week,
  };
}
