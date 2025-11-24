import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { changePasswordValidation, loginValidation } from '../utils/validators.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const result = await AuthController.login(username, password);

    if (result.success) {
      return res.json(result);
    }

    return res.status(401).json(result);
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await AuthController.logout();
    return res.json(result);
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await AuthController.getCurrentUser(req.user.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  authenticate,
  changePasswordValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthController.changePassword(req.user.id, currentPassword, newPassword);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  })
);

/**
 * @route   GET /api/auth/first-run
 * @desc    Check if first run
 * @access  Public
 */
router.get(
  '/first-run',
  asyncHandler(async (req, res) => {
    const result = await AuthController.checkFirstRun();
    return res.json(result);
  })
);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (admin only)
 * @access  Private (Admin)
 */
router.post(
  '/register',
  authenticate,
  asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can register new users',
      });
    }

    const result = await AuthController.register(req.body);

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(400).json(result);
  })
);

export default router;
