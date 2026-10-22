/**
 * Calendar date helpers. Dates are handled as 'YYYY-MM-DD' strings and all
 * arithmetic is done in UTC so results never depend on the server's timezone.
 */

export const DEFAULT_TIMEZONE = 'UTC';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const isValidTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Picks the first valid IANA timezone from the candidates, falling back to UTC.
 */
export const resolveTimezone = (...candidates: (string | undefined | null)[]): string => {
  for (const candidate of candidates) {
    if (candidate && isValidTimezone(candidate)) {
      return candidate;
    }
  }
  return DEFAULT_TIMEZONE;
};

export const isValidDateString = (value: string): boolean => {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/**
 * Returns the current calendar date ('YYYY-MM-DD') in the given timezone.
 */
export const getTodayInTimezone = (timezone: string, now: Date = new Date()): string => {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
};

/**
 * Normalizes a DATE column value to 'YYYY-MM-DD'.
 * node-postgres parses DATE as local midnight, while some drivers (pg-mem) use
 * UTC midnight, so pick whichever representation lands exactly on midnight.
 */
export const toDateString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0) {
      return value.toISOString().slice(0, 10);
    }
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const toUtcDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export const addDays = (date: string, days: number): string => {
  return new Date(toUtcDate(date).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
};

/**
 * Number of whole days from `from` to `to` (negative when `to` is earlier).
 */
export const diffInDays = (from: string, to: string): number => {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / MS_PER_DAY);
};

export const getWeekdayName = (date: string): Weekday => WEEKDAYS[toUtcDate(date).getUTCDay()];

/**
 * Weeks start on Monday.
 */
export const startOfWeek = (date: string): string => {
  const day = toUtcDate(date).getUTCDay();
  return addDays(date, -((day + 6) % 7));
};

export const endOfWeek = (date: string): string => addDays(startOfWeek(date), 6);

export const startOfMonth = (date: string): string => `${date.slice(0, 7)}-01`;

export const endOfMonth = (date: string): string => {
  const d = toUtcDate(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return addDays(d.toISOString().slice(0, 10), -1);
};

export const eachDate = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  for (let current = startDate; current <= endDate; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
};

export const minDate = (a: string, b: string): string => (a < b ? a : b);
export const maxDate = (a: string, b: string): string => (a > b ? a : b);

export type Period = 'day' | 'week' | 'month';

export const getPeriodRange = (
  period: Period,
  anchorDate: string
): { startDate: string; endDate: string } => {
  if (period === 'day') {
    return { startDate: anchorDate, endDate: anchorDate };
  }
  if (period === 'month') {
    return { startDate: startOfMonth(anchorDate), endDate: endOfMonth(anchorDate) };
  }
  return { startDate: startOfWeek(anchorDate), endDate: endOfWeek(anchorDate) };
};
