const { calculateWorkingDays, isWeekend, isHoliday } = require('../utils/calculateLeaveDays');

describe('calculateWorkingDays', () => {
  it('counts a plain Mon-Fri week as 5 working days', () => {
    expect(calculateWorkingDays('2026-01-05', '2026-01-09')).toBe(5);
  });

  it('excludes weekends from a range that spans a weekend', () => {
    expect(calculateWorkingDays('2026-01-09', '2026-01-12')).toBe(2);
  });

  it('excludes a known India public holiday (Republic Day, 2026-01-26, a Monday)', () => {
    expect(calculateWorkingDays('2026-01-26', '2026-01-30')).toBe(4);
  });

  it('isWeekend / isHoliday flag the right dates', () => {
    expect(isWeekend(new Date('2026-01-10T00:00:00'))).toBe(true);
    expect(isWeekend(new Date('2026-01-12T00:00:00'))).toBe(false);
    expect(isHoliday(new Date('2026-08-15T00:00:00'))).toBe(true);
    expect(isHoliday(new Date('2026-08-16T00:00:00'))).toBe(false);
  });

  it('falls back to weekends-only when a year has no holiday data loaded', () => {
    expect(calculateWorkingDays('2040-01-01', '2040-01-07')).toBe(5);
  });
});