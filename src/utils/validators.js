import { body, param, query } from 'express-validator';

/**
 * Login Validation
 */
export const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

/**
 * Change Password Validation
 */
export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

/**
 * Product Validation
 */
export const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('product_type_id').isInt().withMessage('Valid product type is required'),
  body('category_id').isInt().withMessage('Valid category is required'),
  body('reorder_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reorder level must be a positive number'),
];

export const updateProductValidation = [
  param('id').isInt().withMessage('Valid product ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('product_type_id').optional().isInt().withMessage('Valid product type is required'),
  body('category_id').optional().isInt().withMessage('Valid category is required'),
];

/**
 * Supplier Validation
 */
export const createSupplierValidation = [
  body('name').trim().notEmpty().withMessage('Supplier name is required'),
  body('contact_person').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
];

/**
 * Sale Validation
 */
export const createSaleValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  // body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('payment_method')
    .isIn(['cash', 'card', 'mobile'])
    .withMessage('Valid payment method is required'),
  // body('payment_status')
  //   .isIn(['paid', 'partial', 'pending'])
  //   .withMessage('Valid payment status is required'),
];

/**
 * Stock Receipt Validation
 */
export const createStockReceiptValidation = [
  body('header.supplierId').isInt().withMessage('Valid supplier ID is required'),
  body('header.receiptDate').notEmpty().withMessage('Receipt date is required'),
  body('entries').isArray({ min: 1 }).withMessage('At least one product line is required'),
  body('entries.*.productId').isInt().withMessage('Valid product ID is required'),
  body('entries.*.batchNumber').trim().notEmpty().withMessage('Batch number is required'),
  body('entries.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('entries.*.costPrice').isFloat({ min: 0.01 }).withMessage('Cost price must be positive'),
  body('entries.*.sellingPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Selling price must be positive'),
];

/**
 * ID Parameter Validation
 */
export const idValidation = [param('id').isInt().withMessage('Valid ID is required')];

/**
 * Pagination Validation
 */
export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortField').optional().isString().withMessage('Sort field must be a string'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', '1', '-1'])
    .withMessage('Sort order must be ASC, DESC, 1, or -1'),
];

export default {
  loginValidation,
  changePasswordValidation,
  createProductValidation,
  updateProductValidation,
  createSupplierValidation,
  createSaleValidation,
  createStockReceiptValidation,
  idValidation,
  paginationValidation,
};
