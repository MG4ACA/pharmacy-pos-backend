import express from 'express';
import MetaController from '../controllers/MetaController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/meta/product-types
 * @desc    Get all product types
 * @access  Private
 */
router.get(
  '/product-types',
  asyncHandler(async (req, res) => {
    const result = await MetaController.getAllProductTypes();
    return res.json(result);
  })
);

/**
 * @route   GET /api/meta/categories
 * @desc    Get all categories
 * @access  Private
 */
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const result = await MetaController.getAllCategories();
    return res.json(result);
  })
);

export default router;
