const { holidaysForYear } = require('../data/indiaHolidays');

const getHolidaysForYear = (year) => {
  const list = holidaysForYear(year);
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
};

module.exports = { getHolidaysForYear };