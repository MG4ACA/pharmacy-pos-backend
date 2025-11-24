import express from 'express';
import StockController from '../controllers/StockController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idValidation } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/stock/product/:id
 * @desc    Get stock by product ID
 * @access  Private
 */
router.get(
  '/product/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockController.getStockByProduct(req.params.id);
    return res.json(result);
  })
);

/**
 * @route   GET /api/stock/batch/:id
 * @desc    Get batch details
 * @access  Private
 */
router.get(
  '/batch/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockController.getBatchDetails(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   POST /api/stock/deduct
 * @desc    Deduct stock
 * @access  Private
 */
router.post(
  '/deduct',
  asyncHandler(async (req, res) => {
    const result = await StockController.deductStock(req.body);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  })
);

/**
 * @route   GET /api/stock/expiring
 * @desc    Get expiring stock
 * @access  Private
 */
router.get(
  '/expiring',
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const result = await StockController.getExpiringStock(days);
    return res.json(result);
  })
);

/**
 * @route   POST /api/stock/return
 * @desc    Return stock to batch
 * @access  Private
 */
router.post(
  '/return',
  asyncHandler(async (req, res) => {
    const result = await StockController.returnStock(req.body);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  })
);

export default router;
