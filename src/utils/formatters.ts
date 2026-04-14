// Reg_Number_Pattern: [S|F][YY][Campus+Dept][Program][Shift][Prefix][Serial]
// Example: S23BARIN1M01037
// Uses a loose match (any campus/dept string, any program digit) to be robust against variations.
const REG_NUMBER_REGEX = /^([SF])(\d{2})[A-Z]+(\d)([ME])\d{2}(\d{3})/;

// Section_Name_Pattern: BSARIN-[N]TH-[Num][Shift]
// Example: BSARIN-7TH-1M
const SECTION_NAME_REGEX = /(\d+)TH-(\d+)([ME])/i;

// Session_Name format: [YYYY] [Spring|Fall]
// Example: 2026 Spring
const SESSION_NAME_REGEX = /^(\d{4}) (Spring|Fall)$/;

/**
 * Compares two IUB registration numbers for ascending sort.
 *
 * Pattern: [S|F][YY][Campus+Dept][Program][Shift][Prefix][Serial]
 * Example: S23BARIN1M01037
 *
 * Sort priority (ascending):
 *   1. Year (older batches first)
 *   2. Semester: Spring (S=0) before Fall (F=1)
 *   3. Program number: 1 (BS Morning) → 2 (BS Evening) → 7 (ADP)
 *   4. Shift: Morning (M=0) before Evening (E=1)
 *   5. Serial number
 *
 * Unparseable reg numbers fall to the end; falls back to localeCompare.
 */
export function compareRegNumbers(a: string, b: string): number {
  const ma = REG_NUMBER_REGEX.exec(a);
  const mb = REG_NUMBER_REGEX.exec(b);

  if (!ma && !mb) return a.localeCompare(b);
  if (!ma) return 1;
  if (!mb) return -1;

  const [, semA, yearA, progA, shiftA, serialA] = ma;
  const [, semB, yearB, progB, shiftB, serialB] = mb;

  return (
    (parseInt(yearA, 10)  - parseInt(yearB, 10))  ||
    ((semA === 'S' ? 0 : 1) - (semB === 'S' ? 0 : 1)) ||
    (parseInt(progA, 10)  - parseInt(progB, 10))  ||
    ((shiftA === 'M' ? 0 : 1) - (shiftB === 'M' ? 0 : 1)) ||
    (parseInt(serialA, 10) - parseInt(serialB, 10))
  );
}

/**
 * Compares two IUB section names for ascending sort.
 *
 * Pattern: BSARIN-[N]TH-[Num][Shift]
 * Example: BSARIN-7TH-1M
 *
 * Sort priority (ascending):
 *   1. Semester number (7TH < 8TH < 9TH)
 *   2. Shift: Morning (M=0) before Evening (E=1)  ← shift before section number
 *   3. Section number (1 < 2 < 3)
 *
 * Example sorted order:
 *   BSARIN-7TH-1M, BSARIN-7TH-2M, BSARIN-7TH-3M,
 *   BSARIN-7TH-1E, BSARIN-8TH-1M, BSARIN-8TH-2M, BSARIN-8TH-1E
 *
 * Unparseable names fall to the end; falls back to localeCompare.
 */
export function compareSectionNames(a: string, b: string): number {
  const ma = SECTION_NAME_REGEX.exec(a);
  const mb = SECTION_NAME_REGEX.exec(b);

  if (!ma && !mb) return a.localeCompare(b);
  if (!ma) return 1;
  if (!mb) return -1;

  const [, semNumA, secNumA, shiftA] = ma;
  const [, semNumB, secNumB, shiftB] = mb;

  return (
    (parseInt(semNumA, 10) - parseInt(semNumB, 10)) ||
    ((shiftA.toUpperCase() === 'M' ? 0 : 1) - (shiftB.toUpperCase() === 'M' ? 0 : 1)) ||
    (parseInt(secNumA, 10) - parseInt(secNumB, 10))
  );
}

/**
 * Compares two session names for ascending chronological sort.
 *
 * Pattern: [YYYY] [Spring|Fall]
 * Example: 2026 Spring
 *
 * Sort priority (ascending):
 *   1. Year (older first)
 *   2. Term: Spring (0) before Fall (1)
 *
 * Falls back to localeCompare on parse failure.
 */
export function compareSessionNames(a: string, b: string): number {
  const ma = SESSION_NAME_REGEX.exec(a);
  const mb = SESSION_NAME_REGEX.exec(b);

  if (!ma || !mb) return a.localeCompare(b);

  const [, yearA, termA] = ma;
  const [, yearB, termB] = mb;

  return (
    (parseInt(yearA, 10) - parseInt(yearB, 10)) ||
    ((termA === 'Spring' ? 0 : 1) - (termB === 'Spring' ? 0 : 1))
  );
}

// ── Date/Time formatting ──────────────────────────────────────────────────────

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/**
 * Format any date/ISO string to: yyyy-MMMM-dd hh:mmaa (local timezone)
 * e.g. "2026-April-12 09:05pm"
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year  = d.getFullYear();
  const month = MONTHS_LONG[d.getMonth()];
  const day   = pad(d.getDate());
  const h24   = d.getHours();
  const h12   = pad(h24 % 12 === 0 ? 12 : h24 % 12);
  const min   = pad(d.getMinutes());
  const ampm  = h24 < 12 ? 'am' : 'pm';
  return `${year}-${month}-${day} ${h12}:${min}${ampm}`;
}

/**
 * Format any date/ISO string to date only: yyyy-MMMM-dd (local timezone)
 * e.g. "2026-April-12"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${MONTHS_LONG[d.getMonth()]}-${pad(d.getDate())}`;
}
