import express from 'express';
import ReportController from '../controllers/ReportController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/reports/daily-sales
 * @desc    Get daily sales report
 * @access  Private
 */
router.get(
  '/daily-sales',
  asyncHandler(async (req, res) => {
    const result = await ReportController.getDailySalesReport(req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/reports/stock-level
 * @desc    Get stock level report
 * @access  Private
 */
router.get(
  '/stock-level',
  asyncHandler(async (req, res) => {
    const result = await ReportController.getStockLevelReport();
    return res.json(result);
  })
);

/**
 * @route   GET /api/reports/expiring
 * @desc    Get expiring products report
 * @access  Private
 */
router.get(
  '/expiring',
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const result = await ReportController.getExpiringProductsReport(days);
    return res.json(result);
  })
);

/**
 * @route   GET /api/reports/top-selling
 * @desc    Get top selling products report
 * @access  Private
 */
router.get(
  '/top-selling',
  asyncHandler(async (req, res) => {
    const result = await ReportController.getTopSellingProducts(req.query);
    return res.json(result);
  })
);

export default router;
