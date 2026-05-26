const express = require('express');
const { checkPermission } = require('../middleware/rbac');
const debtController = require('../controllers/debtController');

const router = express.Router();

router.get('/summary', checkPermission('read:reminder'), debtController.getSummary);
router.get('/reminders', checkPermission('read:reminder'), debtController.getReminders);
router.get('/reminders/upcoming', checkPermission('read:reminder'), debtController.getUpcomingReminders);
router.post('/reminders', checkPermission('create:reminder'), debtController.createReminder);
router.patch('/reminders/:id/read', checkPermission('update:reminder'), debtController.markRead);
router.delete('/reminders/:id', checkPermission('delete:reminder'), debtController.deleteReminder);
router.get('/tracker/:documentId', checkPermission('read:reminder'), debtController.getTracker);

module.exports = router;
