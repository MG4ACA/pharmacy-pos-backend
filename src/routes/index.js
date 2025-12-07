import express from 'express';

// Import route modules
import authRoutes from './auth.routes.js';
import backupRoutes from './backup.js';
import dashboardRoutes from './dashboard.routes.js';
import exportRoutes from './export.js';
import metaRoutes from './meta.routes.js';
import productRoutes from './product.routes.js';
import reportRoutes from './report.routes.js';
import saleRoutes from './sale.routes.js';
import stockRoutes from './stock.routes.js';
import stockReceiptRoutes from './stockReceipt.routes.js';
import supplierRoutes from './supplier.routes.js';

const router = express.Router();

/**
 * Health Check Endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Pharmacy POS API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Info Endpoint
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Pharmacy POS API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      stock: '/api/stock',
      stockReceipts: '/api/stock-receipts',
      suppliers: '/api/suppliers',
      sales: '/api/sales',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      meta: '/api/meta',
      backup: '/api/backup',
      export: '/api/export',
    },
  });
});

/**
 * Mount routes
 */
router.use('/auth', authRoutes);
router.use('/backup', backupRoutes);
router.use('/export', exportRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/stock-receipts', stockReceiptRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales', saleRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/meta', metaRoutes);

export default router;
