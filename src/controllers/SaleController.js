import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Product, Sale, SaleItem, StockEntry, User } from '../database/models/index.js';
import StockController from './StockController.js';

class SaleController {
  /**
   * Create new sale with automatic FIFO stock deduction
   * @param {Object} saleData - Sale data including items array
   * @returns {Object} Result with success status and sale data
   */
  async createSale(saleData) {
    const transaction = await sequelize.transaction();

    try {
      const {
        user_id,
        items,
        discount = 0,
        tax = 0,
        payment_method = 'cash',
        notes = '',
      } = saleData;

      // Validate required fields
      if (!user_id) {
        await transaction.rollback();
        return {
          success: false,
          message: 'User ID is required',
        };
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: 'At least one item is required',
        };
      }

      // Validate each item
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          await transaction.rollback();
          return {
            success: false,
            message: 'Invalid item data: product_id and quantity are required',
          };
        }
      }

      // Calculate subtotal and prepare sale items
      let subtotal = 0;
      const saleItems = [];

      for (const item of items) {
        // Get product details
        const product = await Product.findByPk(item.product_id, { transaction });

        if (!product) {
          await transaction.rollback();
          return {
            success: false,
            message: `Product with ID ${item.product_id} not found`,
          };
        }

        // Get all stock batches with available quantity for this product
        const stockBatches = await StockEntry.findAll({
          where: {
            product_id: item.product_id,
            quantity_remaining: {
              [Op.gt]: 0,
            },
          },
          order: [['entry_date', 'ASC']],
          transaction,
        });

        if (!stockBatches || stockBatches.length === 0) {
          await transaction.rollback();
          return {
            success: false,
            message: `No stock available for product: ${product.name}`,
          };
        }

        // Calculate total available stock across all batches
        const totalAvailableStock = stockBatches.reduce(
          (sum, batch) => sum + batch.quantity_remaining,
          0
        );

        // Check if we have enough stock
        if (totalAvailableStock < item.quantity) {
          await transaction.rollback();
          return {
            success: false,
            message: `Insufficient stock for product: ${product.name}. Available: ${totalAvailableStock}, Requested: ${item.quantity}`,
          };
        }

        // Use the selling price from the oldest batch (FIFO pricing)
        const unit_price = parseFloat(stockBatches[0].selling_price);
        const itemSubtotal = unit_price * item.quantity;
        subtotal += itemSubtotal;

        saleItems.push({
          product_id: item.product_id,
          stock_entry_id: stockBatches[0].id, // Use the oldest batch ID for reference
          quantity: item.quantity,
          unit_price: unit_price,
          subtotal: itemSubtotal,
        });
      }

      // Calculate total amount
      const discountAmount = parseFloat(discount) || 0;
      const taxAmount = parseFloat(tax) || 0;
      const total_amount = subtotal - discountAmount + taxAmount;

      // Create sale record
      const sale = await Sale.create(
        {
          user_id,
          sale_date: new Date(),
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total_amount,
          payment_method,
          payment_status: 'completed',
          notes,
        },
        { transaction }
      );

      // Create sale items and deduct stock
      for (const saleItem of saleItems) {
        // Deduct stock using FIFO logic
        const deductResult = await StockController.deductStock(
          saleItem.product_id,
          saleItem.quantity,
          transaction
        );

        if (!deductResult.success) {
          await transaction.rollback();
          return deductResult;
        }

        // Calculate total free items deducted across all batches
        const totalFreeDeducted = deductResult.data.deductions.reduce(
          (sum, d) => sum + (d.free_quantity_deducted || 0),
          0
        );

        // Create sale item with free item tracking
        await SaleItem.create(
          {
            sale_id: sale.id,
            ...saleItem,
            is_free_item: totalFreeDeducted > 0,
            free_item_quantity: totalFreeDeducted,
          },
          { transaction }
        );
      }

      // Commit transaction
      await transaction.commit();

      // Fetch complete sale with items for response
      const completeSale = await this.getSaleById(sale.id);

      return {
        success: true,
        data: completeSale.data,
        message: 'Sale completed successfully',
      };
    } catch (error) {
      await transaction.rollback();
      console.error('SaleController.createSale error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create sale',
      };
    }
  }

  /**
   * Get sale by ID with all details
   * @param {number} id - Sale ID
   * @returns {Object} Result with success status and sale data
   */
  async getSaleById(id) {
    try {
      if (!id) {
        return {
          success: false,
          message: 'Sale ID is required',
        };
      }

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name'],
          },
          {
            model: SaleItem,
            as: 'saleItems',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'barcode', 'description'],
              },
              {
                model: StockEntry,
                as: 'stockEntry',
                attributes: ['id', 'batch_number', 'expiry_date'],
              },
            ],
          },
        ],
      });

      if (!sale) {
        return {
          success: false,
          message: 'Sale not found',
        };
      }

      // Convert Sequelize instance to plain JSON for IPC serialization
      const plainSale = sale.toJSON();

      return {
        success: true,
        data: plainSale,
      };
    } catch (error) {
      console.error('SaleController.getSaleById error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sale',
      };
    }
  }

  /**
   * Get today's sales summary
   * @returns {Object} Result with success status and today's sales data
   */
  async getTodaySales() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sales = await Sale.findAll({
        where: {
          sale_date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
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
                attributes: ['id', 'name'],
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

      return {
        success: true,
        data: {
          sales,
          summary: {
            totalSales,
            totalRevenue,
            totalDiscount,
            totalTax,
            date: today.toISOString().split('T')[0],
          },
        },
      };
    } catch (error) {
      console.error('SaleController.getTodaySales error:', error);
      return {
        success: false,
        message: error.message || "Failed to fetch today's sales",
        data: {
          sales: [],
          summary: {
            totalSales: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            totalTax: 0,
            date: new Date().toISOString().split('T')[0],
          },
        },
      };
    }
  }

  /**
   * Update sale details including items
   * @param {number} id - Sale ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Result with success status
   */
  async updateSale(id, updateData) {
    const transaction = await sequelize.transaction();

    try {
      if (!id) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Sale ID is required',
        };
      }

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleItem,
            as: 'saleItems',
          },
        ],
        transaction,
      });

      if (!sale) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Sale not found',
        };
      }

      let newSubtotal = sale.subtotal;

      // Handle item updates if provided
      if (updateData.items && Array.isArray(updateData.items)) {
        // Create a map of existing items
        const existingItems = {};
        sale.saleItems.forEach((item) => {
          existingItems[item.id] = item;
        });

        // Process each item in the update
        newSubtotal = 0;
        const updatedItemIds = [];

        for (const itemData of updateData.items) {
          const existingItem = existingItems[itemData.id];

          if (existingItem) {
            updatedItemIds.push(itemData.id);

            const quantityDiff = itemData.quantity - existingItem.quantity;

            // If quantity changed, adjust stock
            if (quantityDiff !== 0) {
              if (quantityDiff > 0) {
                // Increased quantity - need to deduct more stock
                const product = await Product.findByPk(existingItem.product_id, { transaction });
                if (!product) {
                  await transaction.rollback();
                  return {
                    success: false,
                    message: `Product with ID ${existingItem.product_id} not found`,
                  };
                }

                // Check available stock
                const stockBatches = await StockEntry.findAll({
                  where: {
                    product_id: existingItem.product_id,
                    quantity_remaining: {
                      [Op.gt]: 0,
                    },
                  },
                  order: [['entry_date', 'ASC']],
                  transaction,
                });

                const totalAvailableStock = stockBatches.reduce(
                  (sum, batch) => sum + batch.quantity_remaining,
                  0
                );

                if (totalAvailableStock < Math.abs(quantityDiff)) {
                  await transaction.rollback();
                  return {
                    success: false,
                    message: `Insufficient stock for ${
                      product.name
                    }. Available: ${totalAvailableStock}, Required: ${Math.abs(quantityDiff)}`,
                  };
                }

                // Deduct additional stock
                const deductResult = await StockController.deductStock(
                  existingItem.product_id,
                  Math.abs(quantityDiff),
                  transaction
                );

                if (!deductResult.success) {
                  await transaction.rollback();
                  return deductResult;
                }
              } else {
                // Decreased quantity - return stock
                const returnResult = await StockController.returnStock(
                  existingItem.product_id,
                  existingItem.stock_entry_id,
                  Math.abs(quantityDiff),
                  transaction
                );

                if (!returnResult.success) {
                  await transaction.rollback();
                  return returnResult;
                }
              }
            }

            // Update the item
            await existingItem.update(
              {
                quantity: itemData.quantity,
                unit_price: parseFloat(itemData.unit_price),
                subtotal: parseFloat(itemData.subtotal),
              },
              { transaction }
            );

            newSubtotal += parseFloat(itemData.subtotal);
          }
        }

        // Remove items that are not in the update list
        for (const existingItem of sale.saleItems) {
          if (!updatedItemIds.includes(existingItem.id)) {
            // Return stock for removed item
            const returnResult = await StockController.returnStock(
              existingItem.product_id,
              existingItem.stock_entry_id,
              existingItem.quantity,
              transaction
            );

            if (!returnResult.success) {
              await transaction.rollback();
              return returnResult;
            }

            // Delete the item
            await existingItem.destroy({ transaction });
          }
        }
      }

      // Update sale fields
      const allowedUpdates = {
        subtotal: newSubtotal,
        discount:
          updateData.discount !== undefined ? parseFloat(updateData.discount) : sale.discount,
        tax: updateData.tax !== undefined ? parseFloat(updateData.tax) : sale.tax,
        payment_method: updateData.payment_method || sale.payment_method,
        payment_status: updateData.payment_status || sale.payment_status,
        notes: updateData.notes !== undefined ? updateData.notes : sale.notes,
      };

      // Recalculate total amount
      allowedUpdates.total_amount =
        allowedUpdates.subtotal - allowedUpdates.discount + allowedUpdates.tax;

      await sale.update(allowedUpdates, { transaction });

      await transaction.commit();

      // Fetch updated sale
      const updatedSale = await this.getSaleById(id);

      return {
        success: true,
        data: updatedSale.data,
        message: 'Sale updated successfully',
      };
    } catch (error) {
      await transaction.rollback();
      console.error('SaleController.updateSale error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update sale',
      };
    }
  }

  /**
   * Get sales statistics for dashboard
   * @returns {Object} Result with sales statistics
   */
  async getSalesStatistics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Today's sales
      const todaySales = await Sale.sum('total_amount', {
        where: {
          sale_date: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          payment_status: 'completed',
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

      // Total sales count
      const totalSalesCount = await Sale.count({
        where: {
          payment_status: 'completed',
        },
      });

      return {
        success: true,
        data: {
          todaySales: parseFloat(todaySales) || 0,
          monthSales: parseFloat(monthSales) || 0,
          totalSalesCount,
        },
      };
    } catch (error) {
      console.error('SaleController.getSalesStatistics error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sales statistics',
        data: {
          todaySales: 0,
          monthSales: 0,
          totalSalesCount: 0,
        },
      };
    }
  }

  /**
   * Get sales history with pagination and filters
   * @param {Object} params - Query parameters
   * @returns {Object} Result with success status and sales data
   */
  async getSalesHistory(params = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        start_date,
        end_date,
        payment_method,
        payment_status,
        user_id,
        sortField,
        sortOrder,
      } = params;

      const offset = (page - 1) * limit;

      const whereClause = {};

      // Filter by date range
      if (start_date || end_date) {
        whereClause.sale_date = {};
        if (start_date) {
          whereClause.sale_date[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          // Add one day to include the end date
          const endDateObj = new Date(end_date);
          endDateObj.setDate(endDateObj.getDate() + 1);
          whereClause.sale_date[Op.lt] = endDateObj;
        }
      }

      // Filter by payment method
      if (payment_method) {
        whereClause.payment_method = payment_method;
      }

      // Filter by payment status
      if (payment_status) {
        whereClause.payment_status = payment_status;
      }

      // Filter by user
      if (user_id) {
        whereClause.user_id = user_id;
      }

      // Handle sorting
      let order = [['sale_date', 'DESC']];
      if (sortField) {
        const sortOrderValue = sortOrder === 1 ? 'ASC' : 'DESC';
        // Map frontend field names to database column names
        const fieldMapping = {
          id: 'id',
          sale_date: 'sale_date',
          subtotal: 'subtotal',
          discount: 'discount',
          total_amount: 'total_amount',
          payment_method: 'payment_method',
          payment_status: 'payment_status',
        };

        const dbField = fieldMapping[sortField];
        if (dbField) {
          order = [[dbField, sortOrderValue]];
        }
      }

      const { count, rows: sales } = await Sale.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name'],
          },
          {
            model: SaleItem,
            as: 'saleItems',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name'],
              },
              {
                model: StockEntry,
                as: 'stockEntry',
                attributes: ['id', 'batch_number'],
              },
            ],
          },
        ],
        order,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      // Convert Sequelize instances to plain JSON
      const plainSales = sales.map((sale) => {
        const saleData = sale.toJSON();

        // Calculate profit metrics for each sale
        let totalCost = 0;
        let totalCostExcludingFree = 0;
        let totalFreeItemsRevenue = 0;

        if (saleData.saleItems && saleData.saleItems.length > 0) {
          saleData.saleItems.forEach((item) => {
            const costPrice = parseFloat(item.stockEntry?.cost_price || 0);
            const sellingPrice = parseFloat(item.unit_price);
            const quantity = parseInt(item.quantity);
            const freeQuantity = parseInt(item.free_item_quantity || 0);
            const purchasedQuantity = quantity - freeQuantity;

            // Total cost (purchased items only, free items have zero cost)
            totalCost += costPrice * purchasedQuantity;
            totalCostExcludingFree += costPrice * purchasedQuantity;

            // Revenue from free items
            if (freeQuantity > 0) {
              totalFreeItemsRevenue += sellingPrice * freeQuantity;
            }
          });
        }

        // Calculate profit metrics
        const revenue = parseFloat(saleData.total_amount);
        const grossProfit = revenue - totalCost; // Includes free items revenue
        const netProfit = revenue - totalFreeItemsRevenue - totalCostExcludingFree; // Excludes free items

        return {
          ...saleData,
          profitMetrics: {
            totalCost,
            grossProfit,
            netProfit,
            freeItemsRevenue: totalFreeItemsRevenue,
            grossProfitMargin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0,
            netProfitMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
          },
        };
      });

      return {
        success: true,
        data: plainSales,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error('SaleController.getSalesHistory error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sales history',
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Get free items sales report
   * @param {Object} params - Query parameters with date range
   * @returns {Object} Result with free items analytics
   */
  async getFreeItemsSalesReport(params = {}) {
    try {
      const { start_date, end_date } = params;

      const whereClause = { payment_status: 'completed' };

      // Filter by date range
      if (start_date || end_date) {
        whereClause.sale_date = {};
        if (start_date) {
          whereClause.sale_date[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          const endDateObj = new Date(end_date);
          endDateObj.setDate(endDateObj.getDate() + 1);
          whereClause.sale_date[Op.lt] = endDateObj;
        }
      }

      // Get sales with free items
      const salesWithFreeItems = await Sale.findAll({
        where: whereClause,
        include: [
          {
            model: SaleItem,
            as: 'saleItems',
            where: {
              free_item_quantity: {
                [Op.gt]: 0,
              },
            },
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'barcode'],
              },
              {
                model: StockEntry,
                as: 'stockEntry',
                attributes: ['id', 'batch_number', 'cost_price'],
              },
            ],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name'],
          },
        ],
        order: [['sale_date', 'DESC']],
      });

      // Calculate summary metrics
      let totalFreeItemsSold = 0;
      let totalFreeItemsRevenue = 0;
      const productBreakdown = {};

      salesWithFreeItems.forEach((sale) => {
        sale.saleItems.forEach((item) => {
          const freeQty = parseInt(item.free_item_quantity || 0);
          const unitPrice = parseFloat(item.unit_price);
          const revenue = freeQty * unitPrice;

          totalFreeItemsSold += freeQty;
          totalFreeItemsRevenue += revenue;

          // Product-level breakdown
          const productId = item.product_id;
          if (!productBreakdown[productId]) {
            productBreakdown[productId] = {
              product_id: productId,
              product_name: item.product?.name || 'Unknown',
              barcode: item.product?.barcode || '',
              total_free_quantity: 0,
              total_revenue: 0,
              sales_count: 0,
            };
          }

          productBreakdown[productId].total_free_quantity += freeQty;
          productBreakdown[productId].total_revenue += revenue;
          productBreakdown[productId].sales_count += 1;
        });
      });

      const topFreeItemProducts = Object.values(productBreakdown)
        .sort((a, b) => b.total_free_quantity - a.total_free_quantity)
        .slice(0, 10);

      return {
        success: true,
        data: {
          sales: salesWithFreeItems.map((s) => s.toJSON()),
          summary: {
            totalSalesWithFreeItems: salesWithFreeItems.length,
            totalFreeItemsSold,
            totalFreeItemsRevenue,
            averageRevenuePerSale:
              salesWithFreeItems.length > 0
                ? (totalFreeItemsRevenue / salesWithFreeItems.length).toFixed(2)
                : 0,
          },
          topProducts: topFreeItemProducts,
        },
      };
    } catch (error) {
      console.error('SaleController.getFreeItemsSalesReport error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch free items sales report',
        data: {
          sales: [],
          summary: {
            totalSalesWithFreeItems: 0,
            totalFreeItemsSold: 0,
            totalFreeItemsRevenue: 0,
            averageRevenuePerSale: 0,
          },
          topProducts: [],
        },
      };
    }
  }
}

export default new SaleController();
