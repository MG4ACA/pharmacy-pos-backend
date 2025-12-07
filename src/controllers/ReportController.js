import { Op } from 'sequelize';
import {
  Category,
  Product,
  Sale,
  SaleItem,
  StockEntry,
  Supplier,
} from '../database/models/index.js';

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
            as: 'saleItems',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name'],
                include: [
                  {
                    model: Category,
                    as: 'category',
                    attributes: ['name'],
                  },
                ],
              },
              {
                model: StockEntry,
                as: 'stockEntry',
                attributes: ['cost_price'],
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

      // Calculate total cost and profit
      let totalCost = 0;
      sales.forEach((sale) => {
        sale.saleItems.forEach((item) => {
          const costPrice = parseFloat(item.stockEntry?.cost_price || 0);
          const quantity = parseInt(item.quantity);
          totalCost += costPrice * quantity;
        });
      });

      const grossProfit = totalRevenue - totalCost;
      const netProfit = totalRevenue - totalDiscount - totalCost;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

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
        sale.saleItems.forEach((item) => {
          const category = item.product?.category?.name || 'Uncategorized';
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
            totalCost,
            netRevenue: totalRevenue - totalDiscount,
            grossProfit,
            netProfit,
            profitMargin,
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
      // Get all products with their stock entries
      const products = await Product.findAll({
        include: [
          {
            model: StockEntry,
            as: 'stockEntries',
            attributes: ['quantity_remaining', 'cost_price', 'expiry_date', 'batch_number'],
            where: {
              quantity_remaining: {
                [Op.gt]: 0,
              },
            },
            required: false, // Include products even if they have no stock
          },
          {
            model: Category,
            as: 'category',
            attributes: ['name'],
          },
        ],
        order: [['name', 'ASC']],
      });

      // Calculate stock levels for each product
      const productsWithStock = products.map((product) => {
        const plainProduct = product.toJSON();

        // Calculate total stock from all batches
        const totalStock =
          plainProduct.stockEntries?.reduce(
            (sum, entry) => sum + parseInt(entry.quantity_remaining || 0),
            0
          ) || 0;

        // Calculate total inventory value from all batches
        const inventoryValue =
          plainProduct.stockEntries?.reduce(
            (sum, entry) =>
              sum + parseFloat(entry.cost_price || 0) * parseInt(entry.quantity_remaining || 0),
            0
          ) || 0;

        // Find earliest expiry date
        const earliestExpiry = plainProduct.stockEntries?.reduce((earliest, entry) => {
          if (!entry.expiry_date) return earliest;
          const expiryDate = new Date(entry.expiry_date);
          return !earliest || expiryDate < earliest ? expiryDate : earliest;
        }, null);

        return {
          ...plainProduct,
          totalStock,
          inventoryValue,
          earliestExpiry,
          batchCount: plainProduct.stockEntries?.length || 0,
        };
      });

      // Categorize products based on reorder level
      const lowStock = productsWithStock.filter(
        (p) => p.totalStock > 0 && p.totalStock <= (p.reorder_level || 0)
      );
      const outOfStock = productsWithStock.filter((p) => p.totalStock === 0);
      const inStock = productsWithStock.filter((p) => p.totalStock > (p.reorder_level || 0));

      // Calculate total inventory value
      const totalValue = productsWithStock.reduce(
        (sum, product) => sum + parseFloat(product.inventoryValue || 0),
        0
      );

      return {
        success: true,
        data: {
          summary: {
            totalProducts: productsWithStock.length,
            inStock: inStock.length,
            lowStock: lowStock.length,
            outOfStock: outOfStock.length,
            totalInventoryValue: totalValue,
          },
          products: {
            all: productsWithStock,
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
            attributes: ['id', 'name', 'description', 'barcode'],
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
        return sum + parseFloat(stock.quantity_remaining * stock.cost_price);
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
      const { start_date, end_date, limit = 10, sort_by = 'revenue' } = params;

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
            attributes: ['id', 'name', 'description', 'barcode'],
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['name'],
              },
            ],
          },
          {
            model: StockEntry,
            as: 'stockEntry',
            attributes: ['cost_price'],
          },
        ],
        raw: false,
      });

      // Group by product and calculate metrics
      const productMap = new Map();

      saleItems.forEach((item) => {
        const productId = item.product_id;
        const quantity = parseInt(item.quantity);
        const subtotal = parseFloat(item.subtotal);
        const costPrice = parseFloat(item.stockEntry?.cost_price || 0);
        const itemCost = costPrice * quantity;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product: item.product,
            total_revenue: 0,
            total_cost: 0,
            total_quantity: 0,
            sale_count: 0,
          });
        }

        const productData = productMap.get(productId);
        productData.total_revenue += subtotal;
        productData.total_cost += itemCost;
        productData.total_quantity += quantity;
        productData.sale_count += 1;
      });

      // Convert to array and add profit calculations
      let plainSaleItems = Array.from(productMap.values()).map((item) => ({
        ...item,
        total_profit: item.total_revenue - item.total_cost,
        profit_margin:
          item.total_revenue > 0
            ? ((item.total_revenue - item.total_cost) / item.total_revenue) * 100
            : 0,
      }));

      // Sort based on sort_by parameter
      const sortField = sort_by === 'profit' ? 'total_profit' : 'total_revenue';
      plainSaleItems.sort((a, b) => b[sortField] - a[sortField]);

      // Limit results
      plainSaleItems = plainSaleItems.slice(0, parseInt(limit));

      return {
        success: true,
        data: plainSaleItems,
      };
    } catch (error) {
      console.error('ReportController.getTopSellingProducts error:', error);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        message: error.message || 'Failed to fetch top selling products',
        data: [],
      };
    }
  }
}

export default new ReportController();
