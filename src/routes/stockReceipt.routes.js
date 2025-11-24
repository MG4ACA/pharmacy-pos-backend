import express from 'express';
import StockReceiptController from '../controllers/StockReceiptController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createStockReceiptValidation,
  idValidation,
  paginationValidation,
} from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/stock-receipts/generate-number
 * @desc    Generate new receipt number
 * @access  Private
 */
router.get(
  '/generate-number',
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.generateReceiptNumber();
    return res.json(result);
  })
);

/**
 * @route   GET /api/stock-receipts
 * @desc    Get all stock receipts with filters
 * @access  Private
 */
router.get(
  '/',
  paginationValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.getAllStockReceipts(req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/stock-receipts/supplier/:id
 * @desc    Get stock receipts by supplier
 * @access  Private
 */
router.get(
  '/supplier/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.getReceiptsBySupplier(req.params.id);
    return res.json(result);
  })
);

/**
 * @route   GET /api/stock-receipts/:id
 * @desc    Get stock receipt by ID
 * @access  Private
 */
router.get(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.getReceiptById(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   POST /api/stock-receipts
 * @desc    Create new stock receipt
 * @access  Private
 */
router.post(
  '/',
  createStockReceiptValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.createReceipt(req.body);

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(400).json(result);
  })
);

/**
 * @route   PUT /api/stock-receipts/:id
 * @desc    Update stock receipt
 * @access  Private
 */
router.put(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.updateReceipt(req.params.id, req.body);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   DELETE /api/stock-receipts/:id
 * @desc    Cancel stock receipt
 * @access  Private
 */
router.delete(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await StockReceiptController.cancelReceipt(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

export default router;
