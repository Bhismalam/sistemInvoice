const express = require('express');
const debtController = require('../controllers/debtController');

const router = express.Router();

router.get('/summary', debtController.getSummary);
router.get('/reminders', debtController.getReminders);
router.get('/reminders/upcoming', debtController.getUpcomingReminders);
router.post('/reminders', debtController.createReminder);
router.patch('/reminders/:id/read', debtController.markRead);
router.delete('/reminders/:id', debtController.deleteReminder);
router.get('/tracker/:documentId', debtController.getTracker);

module.exports = router;
