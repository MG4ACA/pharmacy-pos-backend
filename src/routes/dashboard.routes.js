import express from 'express';
import DashboardController from '../controllers/DashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get dashboard summary statistics
 * @access  Private
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const result = await DashboardController.getDashboardSummary();
    return res.json(result);
  })
);

export default router;
