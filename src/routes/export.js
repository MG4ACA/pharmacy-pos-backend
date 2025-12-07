import express from 'express';
import ExportController from '../controllers/ExportController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @route   GET /api/export/sales
 * @desc    Export sales data to CSV
 * @access  Private
 */
router.get(
  '/sales',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, categoryId } = req.query;

    const result = await ExportController.exportSales({
      startDate,
      endDate,
      categoryId,
    });

    if (result.success) {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }

    return res.status(500).json(result);
  })
);

/**
 * @route   GET /api/export/stock-receipts
 * @desc    Export stock receipts data to CSV
 * @access  Private
 */
router.get(
  '/stock-receipts',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, supplierId, categoryId } = req.query;

    const result = await ExportController.exportStockReceipts({
      startDate,
      endDate,
      supplierId,
      categoryId,
    });

    if (result.success) {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }

    return res.status(500).json(result);
  })
);

/**
 * @route   GET /api/export/stats
 * @desc    Get export statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await ExportController.getExportStats();
    return res.json(result);
  })
);

export default router;
