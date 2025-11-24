import { Op } from 'sequelize';
import { Product, Sale, SaleItem, StockEntry, Supplier } from '../database/models/index.js';

class ReportController {
  /**
   * Generate daily sales report
   * @param {Object} params - Query parameters (start_date, end_date)
   * @returns {Object} Result with sales report data
   */
  async getDailySalesReport(params = {}) {
    try {
      const { start_date, end_date } = params;

      if (!start_date || !end_date) {
        return {
          success: false,
          message: 'Start date and end date are required',
        };
      }

      const startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);

      // Get all sales in date range
      const sales = await Sale.findAll({
        where: {
          sale_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          payment_status: 'completed',
        },
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'category'],
              },
            ],
          },
        ],
        order: [['sale_date', 'DESC']],
      });

      // Calculate totals
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
      const totalDiscount = sales.reduce((sum, sale) => sum + parseFloat(sale.discount), 0);
      const totalTax = sales.reduce((sum, sale) => sum + parseFloat(sale.tax), 0);

      // Payment method breakdown
      const paymentBreakdown = {
        cash: 0,
        card: 0,
        other: 0,
      };

      sales.forEach((sale) => {
        paymentBreakdown[sale.payment_method] += parseFloat(sale.total_amount);
      });

      // Category-wise sales
      const categoryTotals = {};
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          const category = item.product?.category || 'Uncategorized';
          if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
          }
          categoryTotals[category] += parseFloat(item.subtotal);
        });
      });

      const plainSales = sales.map((sale) => sale.toJSON());

      return {
        success: true,
        data: {
          dateRange: {
            start: start_date,
            end: end_date,
          },
          summary: {
            totalSales,
            totalRevenue,
            totalDiscount,
            totalTax,
            netRevenue: totalRevenue - totalDiscount,
          },
          paymentBreakdown,
          categoryTotals,
          sales: plainSales,
        },
      };
    } catch (error) {
      console.error('ReportController.getDailySalesReport error:', error);
      return {
        success: false,
        message: error.message || 'Failed to generate daily sales report',
      };
    }
  }

  /**
   * Generate stock level report
   * @returns {Object} Result with stock report data
   */
  async getStockLevelReport() {
    try {
      const products = await Product.findAll({
        order: [['name', 'ASC']],
      });

      const plainProducts = products.map((product) => product.toJSON());

      // Categorize products
      const lowStock = plainProducts.filter((p) => p.total_stock <= p.reorder_level);
      const outOfStock = plainProducts.filter((p) => p.total_stock === 0);
      const inStock = plainProducts.filter(
        (p) => p.total_stock > p.reorder_level && p.total_stock > 0
      );

      // Calculate total inventory value
      let totalValue = 0;
      plainProducts.forEach((product) => {
        totalValue += parseFloat(product.total_stock * (product.purchase_price || 0));
      });

      return {
        success: true,
        data: {
          summary: {
            totalProducts: plainProducts.length,
            inStock: inStock.length,
            lowStock: lowStock.length,
            outOfStock: outOfStock.length,
            totalInventoryValue: totalValue,
          },
          products: {
            all: plainProducts,
            lowStock,
            outOfStock,
            inStock,
          },
        },
      };
    } catch (error) {
      console.error('ReportController.getStockLevelReport error:', error);
      return {
        success: false,
        message: error.message || 'Failed to generate stock level report',
      };
    }
  }

  /**
   * Get expiring products report
   * @param {number} days - Number of days to check (default 30)
   * @returns {Object} Result with expiring products
   */
  async getExpiringProductsReport(days = 30) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const expiringStock = await StockEntry.findAll({
        where: {
          expiry_date: {
            [Op.lte]: futureDate,
            [Op.gte]: today,
          },
          quantity_remaining: {
            [Op.gt]: 0,
          },
        },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'generic_name', 'category', 'type'],
          },
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'contact_person'],
          },
        ],
        order: [['expiry_date', 'ASC']],
      });

      const plainExpiringStock = expiringStock.map((stock) => stock.toJSON());

      // Group by urgency
      const urgent = []; // Expiring in 7 days
      const warning = []; // Expiring in 8-30 days

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      plainExpiringStock.forEach((stock) => {
        if (new Date(stock.expiry_date) <= sevenDaysFromNow) {
          urgent.push(stock);
        } else {
          warning.push(stock);
        }
      });

      // Calculate total value at risk
      const totalValueAtRisk = plainExpiringStock.reduce((sum, stock) => {
        return sum + parseFloat(stock.quantity_remaining * stock.purchase_price);
      }, 0);

      return {
        success: true,
        data: {
          summary: {
            totalItems: plainExpiringStock.length,
            urgentItems: urgent.length,
            warningItems: warning.length,
            totalValueAtRisk,
            daysChecked: days,
          },
          items: {
            all: plainExpiringStock,
            urgent,
            warning,
          },
        },
      };
    } catch (error) {
      console.error('ReportController.getExpiringProductsReport error:', error);
      return {
        success: false,
        message: error.message || 'Failed to generate expiring products report',
      };
    }
  }

  /**
   * Get top selling products
   * @param {Object} params - Query parameters (start_date, end_date, limit)
   * @returns {Object} Result with top products
   */
  async getTopSellingProducts(params = {}) {
    try {
      const { start_date, end_date, limit = 10 } = params;

      const whereClause = {};

      if (start_date || end_date) {
        whereClause.sale_date = {};
        if (start_date) {
          whereClause.sale_date[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          const endDateObj = new Date(end_date);
          endDateObj.setHours(23, 59, 59, 999);
          whereClause.sale_date[Op.lte] = endDateObj;
        }
      }

      whereClause.payment_status = 'completed';

      // Get all sale items in date range
      const saleItems = await SaleItem.findAll({
        include: [
          {
            model: Sale,
            as: 'sale',
            where: whereClause,
            attributes: [],
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'generic_name', 'category'],
          },
        ],
        attributes: [
          'product_id',
          [SaleItem.sequelize.fn('SUM', SaleItem.sequelize.col('quantity')), 'total_quantity'],
          [SaleItem.sequelize.fn('SUM', SaleItem.sequelize.col('subtotal')), 'total_revenue'],
          [SaleItem.sequelize.fn('COUNT', SaleItem.sequelize.col('SaleItem.id')), 'sale_count'],
        ],
        group: ['product_id', 'product.id'],
        order: [[SaleItem.sequelize.literal('total_revenue'), 'DESC']],
        limit: parseInt(limit),
        raw: false,
      });

      const plainSaleItems = saleItems.map((item) => item.toJSON());

      return {
        success: true,
        data: plainSaleItems,
      };
    } catch (error) {
      console.error('ReportController.getTopSellingProducts error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch top selling products',
        data: [],
      };
    }
  }
}

export default new ReportController();
