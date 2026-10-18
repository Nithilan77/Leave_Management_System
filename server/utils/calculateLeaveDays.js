/**
 * calculateLeaveDays
 * -------------------
 * Returns the number of days between two dates, INCLUSIVE of both ends.
 * e.g. startDate = Mon, endDate = Mon  -> 1 day
 *      startDate = Mon, endDate = Fri  -> 5 days
 *
 * This is intentionally simple (calendar days). If you later want to exclude
 * weekends/holidays, this is the single place to change that logic — another
 * reason to keep it in its own helper rather than inline in a controller.
 */
const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to midnight so partial-day time components don't skew the count.
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.round((end - start) / msPerDay);

  return diff + 1; // +1 makes the range inclusive of both start and end
};

const { holidayDateSetForYear } = require('../data/indiaHolidays');

const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isHoliday = (date) => {
  const year = date.getFullYear();
  return holidayDateSetForYear(year).has(toDateKey(date));
};

const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let workingDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!isWeekend(cursor) && !isHoliday(cursor)) workingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return workingDays;
};

module.exports = calculateLeaveDays;
module.exports.calculateWorkingDays = calculateWorkingDays;
module.exports.isWeekend = isWeekend;
module.exports.isHoliday = isHoliday;