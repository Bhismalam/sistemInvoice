const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', notificationController.getNotifications);
router.post('/read', notificationController.markAsRead);

module.exports = router;
