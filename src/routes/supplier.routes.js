import express from 'express';
import SupplierController from '../controllers/SupplierController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createSupplierValidation,
  idValidation,
  paginationValidation,
} from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with filters
 * @access  Private
 */
router.get(
  '/',
  paginationValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SupplierController.getAllSuppliers(req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/suppliers/active
 * @desc    Get active suppliers
 * @access  Private
 */
router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const result = await SupplierController.getActiveSuppliers();
    return res.json(result);
  })
);

/**
 * @route   GET /api/suppliers/:id/products
 * @desc    Get products from supplier
 * @access  Private
 */
router.get(
  '/:id/products',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SupplierController.getProductsFromSupplier(req.params.id);
    return res.json(result);
  })
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SupplierController.getSupplierById(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private
 */
router.post(
  '/',
  createSupplierValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SupplierController.createSupplier(req.body);

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(400).json(result);
  })
);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private
 */
router.put(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SupplierController.updateSupplier({
      id: req.params.id,
      ...req.body,
    });

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete)
 * @access  Private
 */
router.delete(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await SupplierController.deleteSupplier(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

export default router;
