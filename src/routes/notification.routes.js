import express from 'express';
import NotificationController from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences for current user
 * @access  Private
 */
router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.getPreferences(req.user.id);
    return res.json(result);
  })
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/preferences',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.updatePreferences(req.user.id, req.body);
    return res.json(result);
  })
);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.getNotifications(req.user.id, req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.getUnreadCount(req.user.id);
    return res.json(result);
  })
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.markAsRead(req.user.id, req.params.id);
    return res.json(result);
  })
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/mark-all-read',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.markAllAsRead(req.user.id);
    return res.json(result);
  })
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.deleteNotification(req.user.id, req.params.id);
    return res.json(result);
  })
);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete(
  '/read',
  asyncHandler(async (req, res) => {
    const result = await NotificationController.deleteAllRead(req.user.id);
    return res.json(result);
  })
);

export default router;
