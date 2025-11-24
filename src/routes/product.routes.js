import express from 'express';
import ProductController from '../controllers/ProductController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createProductValidation,
  idValidation,
  paginationValidation,
  updateProductValidation,
} from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/products
 * @desc    Get all products with filters and pagination
 * @access  Private
 */
router.get(
  '/',
  paginationValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await ProductController.getAllProducts(req.query);
    return res.json(result);
  })
);

/**
 * @route   GET /api/products/search
 * @desc    Search products by name or barcode
 * @access  Private
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const result = await ProductController.searchProducts(q);
    return res.json(result);
  })
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await ProductController.getProductById(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private
 */
router.post(
  '/',
  createProductValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await ProductController.createProduct(req.body);

    if (result.success) {
      return res.status(201).json(result);
    }

    return res.status(400).json(result);
  })
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private
 */
router.put(
  '/:id',
  updateProductValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await ProductController.updateProduct(req.params.id, req.body);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private
 */
router.delete(
  '/:id',
  idValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await ProductController.deleteProduct(req.params.id);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  })
);

export default router;
