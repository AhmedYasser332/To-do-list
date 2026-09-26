import type { WeekDay } from '@/types/domain';

const WEEKDAY_INDICES: Record<WeekDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon avoids daylight saving edge issues
}

/**
 * Calculates start and end calendar dates for a week, respecting any of the 7 configured start weekdays.
 */
export function getWeekBoundaries(
  dateInput: Date | string,
  firstDayOfWeek: WeekDay = 'monday'
): { start: string; end: string } {
  const date = typeof dateInput === 'string' ? parseDate(dateInput) : new Date(dateInput);
  const currentDay = date.getDay();
  const targetStart = WEEKDAY_INDICES[firstDayOfWeek];

  const diff = (currentDay - targetStart + 7) % 7;
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - diff);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

/**
 * Calculates start and end calendar dates for a given month (month is 1-indexed, e.g., 9 for September).
 */
export function getMonthBoundaries(
  year: number,
  month: number
): { start: string; end: string } {
  const startDate = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, lastDay);

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

/**
 * Calculates start and end calendar dates for a given year.
 */
export function getYearBoundaries(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function addWeeks(dateStr: string, count: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + count * 7);
  return formatDate(date);
}

export function addMonths(dateStr: string, count: number): string {
  const date = parseDate(dateStr);
  date.setMonth(date.getMonth() + count);
  return formatDate(date);
}

export function addYears(dateStr: string, count: number): string {
  const date = parseDate(dateStr);
  date.setFullYear(date.getFullYear() + count);
  return formatDate(date);
}
