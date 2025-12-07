import { Notification, NotificationPreference } from '../database/models/index.js';

class NotificationController {
  /**
   * Get notification preferences for current user
   * @param {Object} userId - User ID from auth middleware
   * @returns {Promise<Object>}
   */
  static async getPreferences(userId) {
    try {
      let preferences = await NotificationPreference.findOne({
        where: { user_id: userId },
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await NotificationPreference.create({
          user_id: userId,
        });
      }

      return {
        success: true,
        data: preferences,
      };
    } catch (error) {
      console.error('NotificationController.getPreferences error:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   * @param {Object} userId - User ID from auth middleware
   * @param {Object} data - Preference data to update
   * @returns {Promise<Object>}
   */
  static async updatePreferences(userId, data) {
    try {
      let preferences = await NotificationPreference.findOne({
        where: { user_id: userId },
      });

      if (!preferences) {
        // Create new preferences
        preferences = await NotificationPreference.create({
          user_id: userId,
          ...data,
        });
      } else {
        // Update existing preferences
        await preferences.update(data);
      }

      return {
        success: true,
        data: preferences,
        message: 'Notification preferences updated successfully',
      };
    } catch (error) {
      console.error('NotificationController.updatePreferences error:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for current user
   * @param {Object} userId - User ID from auth middleware
   * @param {Object} filters - Optional filters (type, is_read, limit)
   * @returns {Promise<Object>}
   */
  static async getNotifications(userId, filters = {}) {
    try {
      const { type, is_read, limit = 50, offset = 0 } = filters;

      const where = { user_id: userId };

      if (type) {
        where.type = type;
      }

      if (is_read !== undefined) {
        where.is_read = is_read === 'true' || is_read === true;
      }

      const notifications = await Notification.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        success: true,
        data: notifications.rows,
        total: notifications.count,
        unreadCount: await Notification.count({
          where: { user_id: userId, is_read: false },
        }),
      };
    } catch (error) {
      console.error('NotificationController.getNotifications error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param {Object} userId - User ID from auth middleware
   * @returns {Promise<Object>}
   */
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.count({
        where: { user_id: userId, is_read: false },
      });

      return {
        success: true,
        count,
      };
    } catch (error) {
      console.error('NotificationController.getUnreadCount error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {Object} userId - User ID from auth middleware
   * @param {number} notificationId - Notification ID
   * @returns {Promise<Object>}
   */
  static async markAsRead(userId, notificationId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId },
      });

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found',
        };
      }

      await notification.markAsRead();

      return {
        success: true,
        data: notification,
        message: 'Notification marked as read',
      };
    } catch (error) {
      console.error('NotificationController.markAsRead error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   * @param {Object} userId - User ID from auth middleware
   * @returns {Promise<Object>}
   */
  static async markAllAsRead(userId) {
    try {
      const updated = await Notification.update(
        { is_read: true, read_at: new Date() },
        { where: { user_id: userId, is_read: false } }
      );

      return {
        success: true,
        message: 'All notifications marked as read',
        updated: updated[0],
      };
    } catch (error) {
      console.error('NotificationController.markAllAsRead error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {Object} userId - User ID from auth middleware
   * @param {number} notificationId - Notification ID
   * @returns {Promise<Object>}
   */
  static async deleteNotification(userId, notificationId) {
    try {
      const deleted = await Notification.destroy({
        where: { id: notificationId, user_id: userId },
      });

      if (deleted === 0) {
        return {
          success: false,
          error: 'Notification not found',
        };
      }

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      console.error('NotificationController.deleteNotification error:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications
   * @param {Object} userId - User ID from auth middleware
   * @returns {Promise<Object>}
   */
  static async deleteAllRead(userId) {
    try {
      const deleted = await Notification.destroy({
        where: { user_id: userId, is_read: true },
      });

      return {
        success: true,
        message: 'All read notifications deleted successfully',
        deleted,
      };
    } catch (error) {
      console.error('NotificationController.deleteAllRead error:', error);
      throw error;
    }
  }

  /**
   * Create a new notification (internal method)
   * @param {Object} data - Notification data
   * @returns {Promise<Object>}
   */
  static async createNotification(data) {
    try {
      const notification = await Notification.create(data);

      return {
        success: true,
        data: notification,
      };
    } catch (error) {
      console.error('NotificationController.createNotification error:', error);
      throw error;
    }
  }

  /**
   * Check and create low stock notifications
   * @returns {Promise<void>}
   */
  static async checkLowStock() {
    try {
      // This would be called by a scheduler
      // Implementation would check stock levels and create notifications
      console.log('Checking low stock levels...');
    } catch (error) {
      console.error('NotificationController.checkLowStock error:', error);
    }
  }

  /**
   * Check and create expiring product notifications
   * @returns {Promise<void>}
   */
  static async checkExpiringProducts() {
    try {
      // This would be called by a scheduler
      // Implementation would check expiry dates and create notifications
      console.log('Checking expiring products...');
    } catch (error) {
      console.error('NotificationController.checkExpiringProducts error:', error);
    }
  }
}

export default NotificationController;
