const ActivityLog = require('../models/ActivityLog');
const { User } = require('../models/User');

const notificationController = {
  async getNotifications(req, res, next) {
    try {
      const notifications = await ActivityLog.findAll(req.user.id, 20, req.user.company_id);
      const unreadCount = await ActivityLog.countUnread(req.user.id, req.user.company_id);

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req, res, next) {
    try {
      await User.markNotificationsRead(req.user.id);
      
      res.json({
        success: true,
        message: 'Notifikasi ditandai sudah dibaca'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = notificationController;
