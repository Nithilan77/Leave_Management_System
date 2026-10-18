const handle = require('../utils/serviceHandler');
const holidayService = require('../services/holidayService');

const getHolidays = handle(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ success: false, message: 'year must be a valid 4-digit year' });
  }
  const holidays = holidayService.getHolidaysForYear(year);
  res.status(200).json({ success: true, year, count: holidays.length, holidays });
});

module.exports = { getHolidays };