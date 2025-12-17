import express from 'express';
import SaleController from '../controllers/SaleController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createSaleValidation, idValidation, paginationValidation } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/sales
 * @desc    Get sales history with filters
 * @access  Private
 */
router.get(
  '/',
  paginationValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SaleController.getSalesHistory(req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/sales/today
 * @desc    Get today's sales
 * @access  Private
 */
router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const result = await SaleController.getTodaySales();
    return res.json(result);
  })
);

/**
 * @route   GET /api/sales/reports/free-items
 * @desc    Get free items sales report
 * @access  Private
 */
router.get(
  '/reports/free-items',
  asyncHandler(async (req, res) => {
    const result = await SaleController.getFreeItemsSalesReport(req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
router.get(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SaleController.getSaleById(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   POST /api/sales
 * @desc    Create new sale
 * @access  Private
 */
router.post(
  '/',
  createSaleValidation,
  validate,
  asyncHandler(async (req, res) => {
    // Add user ID from authenticated request
    const saleData = {
      ...req.body,
      user_id: req.user.id,
    };

    const result = await SaleController.createSale(saleData);

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(400).json(result);
  })
);

/**
 * @route   PUT /api/sales/:id
 * @desc    Update sale
 * @access  Private
 */
router.put(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const saleData = {
      id: req.params.id,
      ...req.body,
    };

    const result = await SaleController.updateSale(saleData);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

export default router;
