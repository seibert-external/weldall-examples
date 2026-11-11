// A fictional dental practice in the demo town Brakenstedt. Patients and the
// appointment book are generated from a fixed seed, relative to the demo day:
// the same patients are overdue by the same number of days on every day, and
// the week grid always starts on a Monday, so next week's gaps never fall on a
// weekend. Codes (treatment kinds, statuses, contact channels) stay German in
// both languages; labels are translated where text is written.
import { addDays, daysBetween } from "../shared/dates.js";

export const PRACTICE = {
  name: "Zahnärzte am Brakenstedter Markt",
  hours: [8, 9, 10, 11, 13, 14, 15, 16],
};

export type PractitionerId = "sommer" | "winter" | "herbst";
export const PRACTITIONERS: { id: PractitionerId; name: string; role: { de: string; en: string }; kinds: string[] }[] = [
  { id: "sommer", name: "Dr. Ilka Sommer", role: { de: "Zahnärztin", en: "Dentist" }, kinds: ["Kontrolle", "Füllung", "Wurzelbehandlung", "Krone"] },
  { id: "winter", name: "Dr. Jan Winter", role: { de: "Zahnarzt", en: "Dentist" }, kinds: ["Kontrolle", "Füllung", "Implantatberatung"] },
  { id: "herbst", name: "Maren Herbst", role: { de: "ZMP, Prophylaxe", en: "Prophylaxis assistant" }, kinds: ["PZR", "PZR", "PZR", "Fluoridierung"] },
];

export const KIND_EN: Record<string, string> = {
  PZR: "Professional cleaning",
  Kontrolle: "Check-up",
  Füllung: "Filling",
  Wurzelbehandlung: "Root canal treatment",
  Krone: "Crown",
  Implantatberatung: "Implant consultation",
  Fluoridierung: "Fluoride treatment",
  Mundhygieneberatung: "Oral hygiene advice",
};
export const STATUS_EN: Record<string, string> = { erschienen: "attended", "nicht erschienen": "no-show", abgesagt: "cancelled", geplant: "scheduled" };
export const CONTACT_EN: Record<string, string> = { SMS: "SMS", "E-Mail": "Email", Telefon: "Phone", Brief: "Letter" };
export const NOTES: Record<string, { de: string; en: string }> = {
  paro: { de: "Parodontitis-Nachsorge, Recall alle 3 Monate", en: "Periodontitis aftercare, recall every 3 months" },
  angst: { de: "Angstpatient, lieber vormittags und mit Vorlauf", en: "Anxious patient, prefers mornings and advance notice" },
  schicht: { de: "Arbeitet Schicht, nur ab 14 Uhr", en: "Works shifts, only from 2 pm" },
  kinder: { de: "Kommt gern mit den Kindern zusammen", en: "Likes to come together with the children" },
  bonus: { de: "Bonusheft: braucht die Vorsorge dieses Jahr noch", en: "Bonus booklet: still needs this year's check-up" },
};

export type Patient = {
  id: string;
  name: string;
  birthYear: number;
  insurance: "GKV" | "PKV";
  contact: "SMS" | "E-Mail" | "Telefon" | "Brief";
  recallMonths: number;
  /** Days between the last prophylaxis and the demo day; fixed per patient. */
  lastProphylaxisDaysAgo: number;
  note: keyof typeof NOTES | null;
};

export type Appointment = {
  id: string;
  date: string;
  time: string;
  practitioner: PractitionerId;
  patientId: string;
  kind: string;
  status: "erschienen" | "nicht erschienen" | "abgesagt" | "geplant";
};

/** Small deterministic generator (mulberry32), so every run tells the same story. */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Anna", "Ben", "Clara", "David", "Emma", "Felix", "Greta", "Hannes", "Ida", "Jonas", "Klara", "Lukas", "Mia", "Noah", "Olga", "Paul", "Rosa", "Simon", "Tina", "Uwe", "Vera", "Willi", "Yara", "Zoe", "Erik", "Frieda", "Gustav", "Helene", "Karl", "Lotte"];
const LAST = ["Albers", "Brandt", "Conrad", "Diehl", "Engel", "Fink", "Graf", "Hahn", "Imhof", "Jung", "Keller", "Lorenz", "Moll", "Nagel", "Ott", "Pohl", "Quast", "Roth", "Seidel", "Thiel", "Ulrich", "Vogt", "Wendt", "Zander", "Brüggemann", "Kessler", "Martens", "Riedel"];
const NOTE_KEYS = Object.keys(NOTES) as (keyof typeof NOTES)[];

function pick<T>(next: () => number, items: readonly T[]): T {
  return items[Math.floor(next() * items.length)]!;
}

export function recallInterval(months: number) {
  return Math.round(months * 30.4);
}

export const PATIENTS: Patient[] = (() => {
  const next = random(20261112);
  const names = new Set<string>();
  const patients: Patient[] = [];
  for (let i = 0; patients.length < 140; i++) {
    const name = `${pick(next, FIRST)} ${pick(next, LAST)}`;
    if (names.has(name)) continue;
    names.add(name);
    const paro = next() < 0.12;
    const recallMonths = paro ? 3 : next() < 0.15 ? 12 : 6;
    const interval = recallInterval(recallMonths);
    // About one in five is overdue, one in seven due within a month, the rest fine.
    const roll = next();
    const daysAgo = roll < 0.2
      ? interval + 3 + Math.floor(next() * 200)
      : roll < 0.34
        ? interval - Math.floor(next() * 29)
        // The last cleaning lies before the appointment book (eight weeks and a few days), so
        // the book never contradicts it.
        : Math.max(65, Math.floor(next() * (interval - 35)));
    patients.push({
      id: `P-${1001 + patients.length}`,
      name,
      birthYear: 1942 + Math.floor(next() * 72),
      insurance: next() < 0.72 ? "GKV" : "PKV",
      contact: pick(next, ["SMS", "SMS", "E-Mail", "E-Mail", "Telefon", "Brief"] as const),
      recallMonths,
      lastProphylaxisDaysAgo: daysAgo,
      note: paro ? "paro" : next() < 0.18 ? pick(next, NOTE_KEYS.filter((k) => k !== "paro")) : null,
    });
  }
  return patients;
})();

/** Weekday no-show odds, Monday to Friday: Mondays and Fridays are the weak days. */
const NO_SHOW = [0.13, 0.05, 0.04, 0.06, 0.16];
/** Booked share of the grid by week offset from the current week. */
const LOAD: Record<number, number> = { 1: 0.72, 2: 0.5, 3: 0.3 };

/** Monday of the week that contains `iso`. */
export function weekStart(iso: string) {
  const weekday = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(iso, -weekday);
}

/** The appointment book from eight weeks back to three weeks ahead of `today`. */
export function appointmentBook(today: string, overdue: Set<string>): Appointment[] {
  const next = random(4711);
  const monday = weekStart(today);
  // Overdue patients have nothing booked ahead; that is why they need a call.
  const regulars = PATIENTS.filter((p) => !overdue.has(p.id));
  // Cleanings ahead go to the patients whose recall falls due first.
  const dueFirst = [...regulars].sort((a, b) => (recallInterval(a.recallMonths) - a.lastProphylaxisDaysAgo) - (recallInterval(b.recallMonths) - b.lastProphylaxisDaysAgo));
  const book: Appointment[] = [];
  const busy = new Set<string>();
  const cleaningBooked = new Set<string>();
  for (let week = -8; week <= 3; week++)
    for (let weekday = 0; weekday < 5; weekday++)
      for (const practitioner of PRACTITIONERS)
        for (const hour of PRACTICE.hours) {
          // Draw every value in a fixed order, whatever the day, so the book stays stable.
          const booked = next();
          const outcome = next();
          const patient = pick(next, PATIENTS);
          const regular = pick(next, regulars);
          let kind = pick(next, practitioner.kinds);
          const date = addDays(monday, week * 7 + weekday);
          const future = date >= today;
          // Prophylaxis gaps next week are the point of the demo: Herbst is less booked.
          const load = (LOAD[week] ?? 0.86) - (practitioner.id === "herbst" && week >= 1 ? 0.2 : 0);
          if (booked > load) continue;
          // Past prophylaxis slots were advice and fluoride; cleanings before the
          // book are recorded per patient. Ahead, one cleaning per patient.
          if (!future && kind === "PZR") kind = "Mundhygieneberatung";
          const cleaning = future && kind === "PZR" ? dueFirst.find((p) => !cleaningBooked.has(p.id)) : undefined;
          if (future && kind === "PZR" && !cleaning) kind = "Fluoridierung";
          const status = future
            ? "geplant"
            : outcome < NO_SHOW[weekday]! ? "nicht erschienen" : outcome > 0.96 ? "abgesagt" : "erschienen";
          const patientId = cleaning?.id ?? (future ? regular.id : patient.id);
          // A patient sits in one chair at a time.
          if (busy.has(`${date} ${hour} ${patientId}`)) continue;
          busy.add(`${date} ${hour} ${patientId}`);
          if (cleaning) cleaningBooked.add(cleaning.id);
          book.push({
            id: `T-${date.replaceAll("-", "")}-${practitioner.id}-${String(hour).padStart(2, "0")}`,
            date,
            time: `${String(hour).padStart(2, "0")}:00`,
            practitioner: practitioner.id,
            patientId,
            kind,
            status,
          });
        }
  return book;
}

export const age = (today: string, birthYear: number) => Number(today.slice(0, 4)) - birthYear;
export const lastProphylaxis = (today: string, p: Patient) => addDays(today, -p.lastProphylaxisDaysAgo);
export const recallDue = (today: string, p: Patient) => addDays(today, recallInterval(p.recallMonths) - p.lastProphylaxisDaysAgo);
export const overdueDays = (today: string, p: Patient) => daysBetween(recallDue(today, p), today);
