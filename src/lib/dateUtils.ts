/**
 * Utility to calculate real-time VALUO game cycle information (ISO week number and day of cycle 1..6)
 */
export function getValuoCycleInfo() {
  const now = new Date();

  // Day of week in JS: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  const day = now.getDay();

  // VALUO cycle: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=6 (Sunday Mercato/Rest)
  const dayNumber = day === 0 ? 6 : Math.min(6, day);

  // Calculate ISO-8601 week number
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  const isSunday = day === 0;
  const isSaturday = day === 6;

  const message = isSaturday
    ? "Élimination de l'escouade ce soir à 20 h !"
    : isSunday
    ? "Trêve dominicale · Nouveau cycle demain !"
    : "Élimination de l'escouade samedi à 20 h.";

  return {
    weekNumber,
    dayNumber,
    isSunday,
    isSaturday,
    message,
  };
}

export function getCurrentWeekNumber(): number {
  return getValuoCycleInfo().weekNumber;
}
