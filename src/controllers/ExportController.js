import { Parser } from 'json2csv';
import { Op } from 'sequelize';
import {
  Category,
  Product,
  Sale,
  SaleItem,
  StockEntry,
  StockReceipt,
  Supplier,
} from '../database/models/index.js';

class ExportController {
  /**
   * Export sales data to CSV
   */
  static async exportSales(filters = {}) {
    try {
      const { startDate, endDate, categoryId } = filters;

      // Build query conditions
      const whereConditions = {};
      if (startDate) {
        whereConditions.sale_date = {
          ...whereConditions.sale_date,
          [Op.gte]: new Date(startDate),
        };
      }
      if (endDate) {
        whereConditions.sale_date = {
          ...whereConditions.sale_date,
          [Op.lte]: new Date(endDate),
        };
      }

      // Build include conditions for category filter
      const includeConditions = [
        {
          model: SaleItem,
          as: 'saleItems',
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                {
                  model: Category,
                  as: 'category',
                  ...(categoryId && {
                    where: { id: categoryId },
                  }),
                },
              ],
            },
            {
              model: StockEntry,
              as: 'stockEntry',
              attributes: ['batch_number', 'cost_price', 'expiry_date'],
            },
          ],
        },
      ];

      // Fetch sales data
      const sales = await Sale.findAll({
        where: whereConditions,
        include: includeConditions,
        order: [['sale_date', 'DESC']],
      });

      // Transform data for CSV export
      const exportData = [];
      sales.forEach((sale) => {
        sale.saleItems.forEach((item) => {
          // Skip if category filter applied and doesn't match
          if (
            categoryId &&
            (!item.product?.category || item.product.category.id !== parseInt(categoryId))
          ) {
            return;
          }

          exportData.push({
            sale_id: sale.id,
            sale_date: sale.sale_date,
            invoice_number: sale.invoice_number || '',
            product_name: item.product?.name || 'N/A',
            product_code: item.product?.product_code || '',
            category: item.product?.category?.name || 'N/A',
            batch_number: item.stockEntry?.batch_number || '',
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price),
            discount: parseFloat(item.discount || 0),
            subtotal: parseFloat(item.subtotal),
            cost_price: item.stockEntry?.cost_price ? parseFloat(item.stockEntry.cost_price) : 0,
            profit: item.stockEntry?.cost_price
              ? parseFloat(item.subtotal) - parseFloat(item.stockEntry.cost_price) * item.quantity
              : 0,
            total_amount: parseFloat(sale.total_amount),
            payment_method: sale.payment_method,
          });
        });
      });

      // Convert to CSV
      const fields = [
        { label: 'Sale ID', value: 'sale_id' },
        { label: 'Sale Date', value: 'sale_date' },
        { label: 'Invoice Number', value: 'invoice_number' },
        { label: 'Product Name', value: 'product_name' },
        { label: 'Product Code', value: 'product_code' },
        { label: 'Category', value: 'category' },
        { label: 'Batch Number', value: 'batch_number' },
        { label: 'Quantity', value: 'quantity' },
        { label: 'Unit Price', value: 'unit_price' },
        { label: 'Discount', value: 'discount' },
        { label: 'Subtotal', value: 'subtotal' },
        { label: 'Cost Price', value: 'cost_price' },
        { label: 'Profit', value: 'profit' },
        { label: 'Total Amount', value: 'total_amount' },
        { label: 'Payment Method', value: 'payment_method' },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);

      return {
        success: true,
        data: csv,
        filename: `sales_export_${new Date().toISOString().split('T')[0]}.csv`,
        recordCount: exportData.length,
      };
    } catch (error) {
      console.error('Export sales error:', error);
      return {
        success: false,
        message: 'Failed to export sales data',
        error: error.message,
      };
    }
  }

  /**
   * Export stock receipts data to CSV
   */
  static async exportStockReceipts(filters = {}) {
    try {
      const { startDate, endDate, supplierId, categoryId } = filters;

      // Build query conditions
      const whereConditions = {};
      if (startDate) {
        whereConditions.receipt_date = {
          ...whereConditions.receipt_date,
          [Op.gte]: new Date(startDate),
        };
      }
      if (endDate) {
        whereConditions.receipt_date = {
          ...whereConditions.receipt_date,
          [Op.lte]: new Date(endDate),
        };
      }
      if (supplierId) {
        whereConditions.supplier_id = supplierId;
      }

      // Fetch stock receipts
      const receipts = await StockReceipt.findAll({
        where: whereConditions,
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'contact_person'],
          },
          {
            model: StockEntry,
            as: 'entries',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Category,
                    as: 'category',
                    ...(categoryId && {
                      where: { id: categoryId },
                    }),
                  },
                ],
              },
            ],
          },
        ],
        order: [['receipt_date', 'DESC']],
      });

      // Transform data for CSV export
      const exportData = [];
      receipts.forEach((receipt) => {
        receipt.entries.forEach((entry) => {
          // Skip if category filter applied and doesn't match
          if (
            categoryId &&
            (!entry.product?.category || entry.product.category.id !== parseInt(categoryId))
          ) {
            return;
          }

          exportData.push({
            receipt_id: receipt.id,
            receipt_number: receipt.receipt_number,
            receipt_date: receipt.receipt_date,
            supplier: receipt.supplier?.name || 'N/A',
            contact_person: receipt.supplier?.contact_person || '',
            product_name: entry.product?.name || 'N/A',
            product_code: entry.product?.product_code || '',
            category: entry.product?.category?.name || 'N/A',
            batch_number: entry.batch_number,
            quantity: entry.quantity,
            cost_price: parseFloat(entry.cost_price),
            selling_price: parseFloat(entry.selling_price),
            profit_margin:
              entry.cost_price > 0
                ? (
                    ((parseFloat(entry.selling_price) - parseFloat(entry.cost_price)) /
                      parseFloat(entry.cost_price)) *
                    100
                  ).toFixed(2)
                : 0,
            expiry_date: entry.expiry_date || '',
            total_cost: parseFloat(entry.cost_price) * entry.quantity,
            notes: receipt.notes || '',
          });
        });
      });

      // Convert to CSV
      const fields = [
        { label: 'Receipt ID', value: 'receipt_id' },
        { label: 'Receipt Number', value: 'receipt_number' },
        { label: 'Receipt Date', value: 'receipt_date' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Contact Person', value: 'contact_person' },
        { label: 'Product Name', value: 'product_name' },
        { label: 'Product Code', value: 'product_code' },
        { label: 'Category', value: 'category' },
        { label: 'Batch Number', value: 'batch_number' },
        { label: 'Quantity', value: 'quantity' },
        { label: 'Cost Price', value: 'cost_price' },
        { label: 'Selling Price', value: 'selling_price' },
        { label: 'Profit Margin (%)', value: 'profit_margin' },
        { label: 'Expiry Date', value: 'expiry_date' },
        { label: 'Total Cost', value: 'total_cost' },
        { label: 'Notes', value: 'notes' },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);

      return {
        success: true,
        data: csv,
        filename: `stock_receipts_export_${new Date().toISOString().split('T')[0]}.csv`,
        recordCount: exportData.length,
      };
    } catch (error) {
      console.error('Export stock receipts error:', error);
      return {
        success: false,
        message: 'Failed to export stock receipts data',
        error: error.message,
      };
    }
  }

  /**
   * Get export statistics
   */
  static async getExportStats() {
    try {
      const [salesCount, stockReceiptsCount] = await Promise.all([
        Sale.count(),
        StockReceipt.count(),
      ]);

      return {
        success: true,
        stats: {
          totalSales: salesCount,
          totalStockReceipts: stockReceiptsCount,
        },
      };
    } catch (error) {
      console.error('Get export stats error:', error);
      return {
        success: false,
        message: 'Failed to get export statistics',
      };
    }
  }
}

export default ExportController;
