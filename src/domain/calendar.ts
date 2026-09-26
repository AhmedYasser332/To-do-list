import type { WeekDay, Horizon } from '@/types/domain';

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

export function getTodayDate(): string {
  return formatDate(new Date());
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

export interface ResolveSchedulingInput {
  currentHorizon: Horizon;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  currentTime?: string | null;
  targetHorizon: Horizon;
  targetDate?: string | null;
  targetTime?: string | null;
  firstDayOfWeek?: WeekDay;
}

export interface ResolveSchedulingOutput {
  periodStart: string | null;
  periodEnd: string | null;
  time: string | null;
}

/**
 * Resolves item scheduling boundaries according to horizon rules,
 * preserving existing boundaries when untouched and computing full
 * calendar periods when changed.
 */
export function resolveItemScheduling(input: ResolveSchedulingInput): ResolveSchedulingOutput {
  const {
    currentHorizon,
    currentPeriodStart,
    currentPeriodEnd,
    currentTime,
    targetHorizon,
    targetDate,
    targetTime,
    firstDayOfWeek = 'monday',
  } = input;

  if (targetHorizon === 'inbox') {
    return {
      periodStart: null,
      periodEnd: null,
      time: null,
    };
  }

  if (targetHorizon === 'day') {
    const date =
      targetDate ||
      (currentHorizon === 'day' ? currentPeriodStart : null) ||
      getTodayDate();
    const time =
      targetTime !== undefined
        ? targetTime || null
        : currentHorizon === 'day'
        ? currentTime || null
        : null;

    return {
      periodStart: date,
      periodEnd: date,
      time,
    };
  }

  if (targetHorizon === 'week') {
    // If saving existing week item without changing date, preserve boundaries
    if (
      currentHorizon === 'week' &&
      currentPeriodStart &&
      currentPeriodEnd &&
      (!targetDate || targetDate === currentPeriodStart)
    ) {
      return {
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
        time: null,
      };
    }

    const anchorDate = targetDate || currentPeriodStart || getTodayDate();
    const { start, end } = getWeekBoundaries(anchorDate, firstDayOfWeek);
    return {
      periodStart: start,
      periodEnd: end,
      time: null,
    };
  }

  if (targetHorizon === 'month') {
    if (
      currentHorizon === 'month' &&
      currentPeriodStart &&
      currentPeriodEnd &&
      (!targetDate ||
        targetDate === currentPeriodStart ||
        targetDate === currentPeriodStart.slice(0, 7))
    ) {
      return {
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
        time: null,
      };
    }

    const anchor = targetDate || currentPeriodStart || getTodayDate();
    const [yearStr, monthStr] = anchor.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const { start, end } = getMonthBoundaries(year, month);
    return {
      periodStart: start,
      periodEnd: end,
      time: null,
    };
  }

  if (targetHorizon === 'year') {
    if (
      currentHorizon === 'year' &&
      currentPeriodStart &&
      currentPeriodEnd &&
      (!targetDate ||
        targetDate === currentPeriodStart ||
        targetDate === currentPeriodStart.slice(0, 4))
    ) {
      return {
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
        time: null,
      };
    }

    const anchor = targetDate || currentPeriodStart || getTodayDate();
    const year = parseInt(anchor.slice(0, 4), 10);
    const { start, end } = getYearBoundaries(year);
    return {
      periodStart: start,
      periodEnd: end,
      time: null,
    };
  }

  return {
    periodStart: null,
    periodEnd: null,
    time: null,
  };
}
