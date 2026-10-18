/**
 * indiaHolidays
 * --------------
 * Static dataset of India's national/gazetted public holidays, used to power
 * the leave calendar and (optionally) holiday-aware day calculation.
 *
 * Dates for movable festivals (Holi, Diwali, Eid, etc.) shift every year by
 * the lunar/regional calendar, so each year is listed explicitly rather than
 * computed. Add a new year's block here each December/January.
 *
 * Shape: { date: 'YYYY-MM-DD', name: string, type: 'national' | 'restricted' }
 *   national   -> the 3 constitutional national holidays, observed everywhere
 *   restricted -> commonly observed gazetted holidays (religious/regional)
 */

const indiaHolidays2026 = [
  { date: '2026-01-01', name: "New Year's Day", type: 'restricted' },
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'restricted' },
  { date: '2026-01-26', name: 'Republic Day', type: 'national' },
  { date: '2026-03-04', name: 'Holi', type: 'restricted' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr', type: 'restricted' },
  { date: '2026-04-03', name: 'Good Friday', type: 'restricted' },
  { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti / Tamil New Year', type: 'restricted' },
  { date: '2026-05-27', name: 'Eid-ul-Zuha (Bakrid)', type: 'restricted' },
  { date: '2026-08-15', name: 'Independence Day', type: 'national' },
  { date: '2026-08-26', name: 'Ganesh Chaturthi', type: 'restricted' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', type: 'restricted' },
  { date: '2026-11-08', name: 'Diwali (Deepavali)', type: 'restricted' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'restricted' },
];

const indiaHolidays2027 = [
  { date: '2027-01-01', name: "New Year's Day", type: 'restricted' },
  { date: '2027-01-14', name: 'Makar Sankranti / Pongal', type: 'restricted' },
  { date: '2027-01-26', name: 'Republic Day', type: 'national' },
  { date: '2027-03-22', name: 'Holi', type: 'restricted' },
  { date: '2027-04-02', name: 'Good Friday', type: 'restricted' },
  { date: '2027-08-15', name: 'Independence Day', type: 'national' },
  { date: '2027-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2027-12-25', name: 'Christmas Day', type: 'restricted' },
];

const HOLIDAYS_BY_YEAR = {
  2026: indiaHolidays2026,
  2027: indiaHolidays2027,
};

const holidaysForYear = (year = new Date().getFullYear()) => {
  return HOLIDAYS_BY_YEAR[year] || [];
};

const holidayDateSetForYear = (year) => {
  return new Set(holidaysForYear(year).map((h) => h.date));
};

module.exports = { HOLIDAYS_BY_YEAR, holidaysForYear, holidayDateSetForYear };