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

module.exports = calculateLeaveDays;
