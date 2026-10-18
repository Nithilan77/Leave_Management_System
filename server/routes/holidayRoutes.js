const express = require('express');
const router = express.Router();
const { getHolidays } = require('../controllers/holidayController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getHolidays);

module.exports = router;