import { describe, it, expect } from 'vitest';
import {
  getWeekBoundaries,
  getMonthBoundaries,
  getYearBoundaries,
  formatDate,
  addWeeks,
  addMonths,
  addYears,
} from '@/domain/calendar';
import type { WeekDay } from '@/types/domain';

describe('Calendar Math & Period Calculations (TDD)', () => {
  // Reference date: Saturday, September 26, 2026
  const refDateStr = '2026-09-26';

  describe('getWeekBoundaries for all 7 weekdays', () => {
    it('computes correct week start and end when first day is Monday', () => {
      const { start, end } = getWeekBoundaries(refDateStr, 'monday');
      expect(start).toBe('2026-09-21'); // Monday
      expect(end).toBe('2026-09-27');   // Sunday
    });

    it('computes correct week start and end when first day is Sunday', () => {
      const { start, end } = getWeekBoundaries(refDateStr, 'sunday');
      expect(start).toBe('2026-09-20'); // Sunday
      expect(end).toBe('2026-09-26');   // Saturday
    });

    it('computes correct week start and end when first day is Saturday', () => {
      const { start, end } = getWeekBoundaries(refDateStr, 'saturday');
      expect(start).toBe('2026-09-26'); // Saturday
      expect(end).toBe('2026-10-02');   // Friday
    });

    it('computes correct boundaries for every possible weekday start without throw', () => {
      const weekdays: WeekDay[] = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];

      weekdays.forEach((day) => {
        const { start, end } = getWeekBoundaries(refDateStr, day);
        expect(start).toBeDefined();
        expect(end).toBeDefined();
        // A full calendar week spans exactly 7 days
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(6); // 7 calendar days inclusive (start to end is 6 day difference)
      });
    });
  });

  describe('Month and Year Boundaries', () => {
    it('returns first and last day of calendar month', () => {
      const { start, end } = getMonthBoundaries(2026, 9); // September 2026
      expect(start).toBe('2026-09-01');
      expect(end).toBe('2026-09-30');
    });

    it('handles leap years correctly for February', () => {
      const { start, end } = getMonthBoundaries(2028, 2); // Feb 2028 is leap year
      expect(start).toBe('2028-02-01');
      expect(end).toBe('2028-02-29');
    });

    it('returns first and last day of calendar year', () => {
      const { start, end } = getYearBoundaries(2026);
      expect(start).toBe('2026-01-01');
      expect(end).toBe('2026-12-31');
    });
  });

  describe('Period Navigation Helpers', () => {
    it('adds and subtracts weeks accurately', () => {
      expect(addWeeks('2026-09-26', 1)).toBe('2026-10-03');
      expect(addWeeks('2026-09-26', -1)).toBe('2026-09-19');
    });

    it('adds and subtracts months accurately', () => {
      expect(addMonths('2026-09-26', 1)).toBe('2026-10-26');
      expect(addMonths('2026-09-26', -1)).toBe('2026-08-26');
    });

    it('adds and subtracts years accurately', () => {
      expect(addYears('2026-09-26', 1)).toBe('2027-09-26');
      expect(addYears('2026-09-26', -1)).toBe('2025-09-26');
    });
  });
});
