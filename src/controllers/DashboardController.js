import { Op } from 'sequelize';
import { Product, Sale, SaleItem, StockEntry } from '../database/models/index.js';

class DashboardController {
  /**
   * Get dashboard summary statistics
   * @param {number} days - Number of days for trend (7 or 30)
   * @returns {Object} Result with dashboard data
   */
  async getDashboardSummary(days = 7) {
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

      // Get chart data
      const salesTrend = await this.getDailySalesTrend(days);
      const topProducts = await this.getTopSellingProducts(10);
      const revenueVsProfit = await this.getRevenueVsProfitTrend(days);

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
          salesTrend,
          topProducts,
          revenueVsProfit,
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
   * Get daily sales trend for chart
   * @param {number} days - Number of days to retrieve
   * @returns {Object} Labels and data for line chart
   */
  async getDailySalesTrend(days = 7) {
    try {
      const labels = [];
      const data = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        labels.push(dayLabel);

        const sales = await Sale.sum('total_amount', {
          where: {
            sale_date: {
              [Op.gte]: date,
              [Op.lt]: nextDate,
            },
            payment_status: 'completed',
          },
        });

        data.push(parseFloat(sales) || 0);
      }

      return { labels, data };
    } catch (error) {
      console.error('Error in getDailySalesTrend:', error);
      return { labels: [], data: [] };
    }
  }

  /**
   * Get top selling products
   * @param {number} limit - Number of products to retrieve
   * @returns {Object} Labels and data for bar chart
   */
  async getTopSellingProducts(limit = 10) {
    try {
      // Get all sales items and aggregate by product
      const saleItems = await SaleItem.findAll({
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['name'],
            required: true,
          },
          {
            model: Sale,
            as: 'sale',
            attributes: [],
            where: {
              payment_status: 'completed',
            },
            required: true,
          },
        ],
        attributes: ['product_id', 'quantity'],
        raw: true,
      });

      // Aggregate quantities by product
      const productMap = {};
      saleItems.forEach((item) => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            name: item['product.name'] || 'Unknown',
            quantity: 0,
          };
        }
        productMap[item.product_id].quantity += item.quantity;
      });

      // Convert to array and sort by quantity
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);

      const labels = topProducts.map((p) => p.name);
      const data = topProducts.map((p) => p.quantity);

      return { labels, data };
    } catch (error) {
      console.error('Error in getTopSellingProducts:', error);
      return { labels: [], data: [] };
    }
  }

  /**
   * Get revenue vs profit trend
   * @param {number} days - Number of days to retrieve
   * @returns {Object} Labels and data for column chart
   */
  async getRevenueVsProfitTrend(days = 7) {
    try {
      const labels = [];
      const revenue = [];
      const profit = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        labels.push(dayLabel);

        // Get revenue for the day
        const dailyRevenue = await Sale.sum('total_amount', {
          where: {
            sale_date: {
              [Op.gte]: date,
              [Op.lt]: nextDate,
            },
            payment_status: 'completed',
          },
        });

        revenue.push(parseFloat(dailyRevenue) || 0);

        // Calculate profit: sum of (quantity * (unit_price - cost_price))
        const saleItems = await SaleItem.findAll({
          include: [
            {
              model: Sale,
              as: 'sale',
              attributes: [],
              where: {
                sale_date: {
                  [Op.gte]: date,
                  [Op.lt]: nextDate,
                },
                payment_status: 'completed',
              },
              required: true,
            },
          ],
          attributes: ['quantity', 'unit_price'],
          raw: true,
        });

        // Aggregate profit for the day
        let dailyProfit = 0;
        saleItems.forEach((item) => {
          // Assuming average cost price is 60% of selling price for estimation
          const costPrice = item.unit_price * 0.6;
          dailyProfit += item.quantity * (item.unit_price - costPrice);
        });

        profit.push(dailyProfit);
      }

      return { labels, revenue, profit };
    } catch (error) {
      console.error('Error in getRevenueVsProfitTrend:', error);
      return { labels: [], revenue: [], profit: [] };
    }
  }
}

export default new DashboardController();
