import { Op } from 'sequelize';
import { Product, Sale, SaleItem, StockEntry } from '../database/models/index.js';

class DashboardController {
  /**
   * Get dashboard summary statistics
   * @returns {Object} Result with dashboard data
   */
  async getDashboardSummary() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Today's sales total
      const todaySales = await Sale.sum('total_amount', {
        where: {
          sale_date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          payment_status: 'completed',
        },
      });

      // Total products count
      const totalProducts = await Product.count();

      // Low stock items (products with total_stock <= reorder_level)
      // Get all products with their stock entries to calculate total stock
      const allProducts = await Product.findAll({
        include: [
          {
            model: StockEntry,
            as: 'stockEntries',
            attributes: ['quantity_remaining'],
            required: false,
          },
        ],
      });

      const lowStockItems = allProducts.filter((product) => {
        const totalStock =
          product.stockEntries?.reduce((sum, entry) => sum + entry.quantity_remaining, 0) || 0;
        return totalStock <= product.reorder_level;
      }).length;

      // Expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringSoon = await StockEntry.count({
        where: {
          expiry_date: {
            [Op.lte]: thirtyDaysFromNow,
            [Op.gte]: today,
          },
          quantity_remaining: {
            [Op.gt]: 0,
          },
        },
      });

      // This month's sales
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthSales = await Sale.sum('total_amount', {
        where: {
          sale_date: {
            [Op.gte]: firstDayOfMonth,
          },
          payment_status: 'completed',
        },
      });

      // Total sales count (all time)
      const totalSalesCount = await Sale.count({
        where: {
          payment_status: 'completed',
        },
      });

      // Recent sales (last 10)
      const recentSales = await Sale.findAll({
        where: {
          payment_status: 'completed',
        },
        order: [['sale_date', 'DESC']],
        limit: 10,
        attributes: ['id', 'sale_date', 'total_amount', 'payment_method'],
      });

      const plainRecentSales = recentSales.map((sale) => sale.toJSON());

      // Free items metrics - Today
      const todayFreeItemsReceived =
        (await StockEntry.sum('free_quantity', {
          where: {
            entry_date: {
              [Op.gte]: today,
              [Op.lt]: tomorrow,
            },
          },
        })) || 0;

      const todayFreeItemsSold =
        (await SaleItem.sum('free_item_quantity', {
          include: [
            {
              model: Sale,
              as: 'sale',
              where: {
                sale_date: {
                  [Op.gte]: today,
                  [Op.lt]: tomorrow,
                },
                payment_status: 'completed',
              },
              attributes: [],
            },
          ],
        })) || 0;

      // Free items metrics - This Month
      const monthFreeItemsReceived =
        (await StockEntry.sum('free_quantity', {
          where: {
            entry_date: {
              [Op.gte]: firstDayOfMonth,
            },
          },
        })) || 0;

      const monthFreeItemsSold =
        (await SaleItem.sum('free_item_quantity', {
          include: [
            {
              model: Sale,
              as: 'sale',
              where: {
                sale_date: {
                  [Op.gte]: firstDayOfMonth,
                },
                payment_status: 'completed',
              },
              attributes: [],
            },
          ],
        })) || 0;

      // Calculate revenue from free items (month)
      const freeItemsSales = await SaleItem.findAll({
        where: {
          free_item_quantity: {
            [Op.gt]: 0,
          },
        },
        include: [
          {
            model: Sale,
            as: 'sale',
            where: {
              sale_date: {
                [Op.gte]: firstDayOfMonth,
              },
              payment_status: 'completed',
            },
            attributes: [],
          },
        ],
        attributes: ['free_item_quantity', 'unit_price'],
      });

      const monthFreeItemsRevenue = freeItemsSales.reduce(
        (sum, item) => sum + item.free_item_quantity * parseFloat(item.unit_price),
        0
      );

      return {
        success: true,
        data: {
          todaySales: parseFloat(todaySales) || 0,
          totalProducts,
          lowStockItems,
          expiringSoon,
          monthSales: parseFloat(monthSales) || 0,
          totalSalesCount,
          recentSales: plainRecentSales,
          freeItems: {
            today: {
              received: todayFreeItemsReceived,
              sold: todayFreeItemsSold,
            },
            month: {
              received: monthFreeItemsReceived,
              sold: monthFreeItemsSold,
              revenue: monthFreeItemsRevenue,
            },
          },
        },
      };
    } catch (error) {
      console.error('DashboardController.getDashboardSummary error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch dashboard summary',
        data: {
          todaySales: 0,
          totalProducts: 0,
          lowStockItems: 0,
          expiringSoon: 0,
          monthSales: 0,
          totalSalesCount: 0,
          recentSales: [],
        },
      };
    }
  }

  /**
   * Get low stock products
   * @returns {Object} Result with low stock products
   */
  async getLowStockProducts() {
    try {
      // Get all products with their stock entries
      const products = await Product.findAll({
        include: [
          {
            model: StockEntry,
            as: 'stockEntries',
            attributes: ['quantity_remaining'],
            required: false,
          },
        ],
      });

      // Calculate total stock and filter low stock items
      const productsWithStock = products.map((product) => {
        const plainProduct = product.toJSON();
        const totalStock =
          plainProduct.stockEntries?.reduce((sum, entry) => sum + entry.quantity_remaining, 0) || 0;
        delete plainProduct.stockEntries;
        return {
          ...plainProduct,
          total_stock: totalStock,
          is_low_stock: totalStock <= plainProduct.reorder_level,
        };
      });

      // Filter and sort low stock items
      const lowStockProducts = productsWithStock
        .filter((p) => p.total_stock <= p.reorder_level)
        .sort((a, b) => a.total_stock - b.total_stock)
        .slice(0, 20);

      return {
        success: true,
        data: lowStockProducts,
      };
    } catch (error) {
      console.error('DashboardController.getLowStockProducts error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch low stock products',
        data: [],
      };
    }
  }

  /**
   * Get expiring products
   * @param {number} days - Number of days to check
   * @returns {Object} Result with expiring products
   */
  async getExpiringProducts(days = 30) {
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
            attributes: ['id', 'name', 'generic_name', 'category'],
          },
        ],
        order: [['expiry_date', 'ASC']],
      });

      const plainExpiringStock = expiringStock.map((stock) => stock.toJSON());

      return {
        success: true,
        data: plainExpiringStock,
      };
    } catch (error) {
      console.error('DashboardController.getExpiringProducts error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch expiring products',
        data: [],
      };
    }
  }
}

export default new DashboardController();
