import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Product, StockEntry, StockReceipt, Supplier, User } from '../database/models/index.js';

class StockReceiptController {
  /**
   * Generate next receipt number in format: SR-YYYY-MM-0001
   */
  async generateReceiptNumber() {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const prefix = `SR-${year}-${month}-`;

      // Get the last receipt number for current month
      const lastReceipt = await StockReceipt.findOne({
        where: {
          receipt_number: {
            [Op.like]: `${prefix}%`,
          },
        },
        order: [['receipt_number', 'DESC']],
      });

      let nextNumber = 1;
      if (lastReceipt) {
        const lastNumber = parseInt(lastReceipt.receipt_number.split('-').pop());
        nextNumber = lastNumber + 1;
      }

      const receiptNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
      return { success: true, data: receiptNumber };
    } catch (error) {
      console.error('Error generating receipt number:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new stock receipt with line items
   */
  async createReceipt(data) {
    const transaction = await sequelize.transaction();

    try {
      const { header, entries, userId } = data;

      // Validate entries
      if (!entries || entries.length === 0) {
        throw new Error('At least one product line is required');
      }

      // Create receipt header
      const receipt = await StockReceipt.create(
        {
          receipt_number: header.receiptNumber,
          supplier_id: header.supplierId,
          receipt_date: header.receiptDate,
          supplier_invoice_number: header.supplierInvoiceNumber || null,
          supplier_invoice_date: header.supplierInvoiceDate || null,
          notes: header.notes || null,
          status: header.status || 'draft',
          created_by: userId,
          total_items: 0,
          total_amount: 0,
        },
        { transaction }
      );

      let totalItems = 0;
      let totalAmount = 0;

      // Create stock entries for each line item
      for (const entry of entries) {
        // Validate entry
        if (!entry.productId || !entry.batchNumber || !entry.quantity || !entry.costPrice) {
          throw new Error('Missing required fields in product line');
        }

        if (entry.quantity <= 0) {
          throw new Error('Quantity must be greater than 0');
        }

        if (entry.costPrice < 0) {
          throw new Error('Cost price cannot be negative');
        }

        // Validate free quantity
        const freeQuantity = entry.freeQuantity || 0;
        if (freeQuantity < 0) {
          throw new Error('Free quantity cannot be negative');
        }

        // Calculate total quantity (purchased + free)
        const totalQuantity = entry.quantity + freeQuantity;

        // Create stock entry
        await StockEntry.create(
          {
            product_id: entry.productId,
            supplier_id: header.supplierId,
            receipt_id: receipt.id,
            batch_number: entry.batchNumber,
            quantity_received: entry.quantity,
            free_quantity: freeQuantity,
            quantity_remaining: totalQuantity,
            cost_price: entry.costPrice,
            selling_price: entry.sellingPrice,
            expiry_date: entry.expiryDate || null,
            entry_date: header.receiptDate,
            notes: entry.notes || null,
          },
          { transaction }
        );

        totalItems += 1;
        // Only calculate cost for purchased items, not free items
        totalAmount += parseFloat(entry.costPrice) * parseInt(entry.quantity);
      }

      // Update receipt totals
      await receipt.update(
        {
          total_items: totalItems,
          total_amount: totalAmount,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        data: {
          id: receipt.id,
          receiptNumber: receipt.receipt_number,
          totalItems,
          totalAmount,
        },
        message: 'Stock receipt created successfully',
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating stock receipt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all stock receipts with filters
   */
  async getAllStockReceipts(filters = {}) {
    try {
      const where = {};

      // Filter by supplier
      if (filters.supplierId) {
        where.supplier_id = filters.supplierId;
      }

      // Filter by status
      if (filters.status) {
        where.status = filters.status;
      }

      // Filter by date range
      if (filters.startDate && filters.endDate) {
        where.receipt_date = {
          [Op.between]: [filters.startDate, filters.endDate],
        };
      } else if (filters.startDate) {
        where.receipt_date = {
          [Op.gte]: filters.startDate,
        };
      } else if (filters.endDate) {
        where.receipt_date = {
          [Op.lte]: filters.endDate,
        };
      }

      // Search by receipt number or invoice number
      if (filters.searchQuery) {
        where[Op.or] = [
          { receipt_number: { [Op.like]: `%${filters.searchQuery}%` } },
          { supplier_invoice_number: { [Op.like]: `%${filters.searchQuery}%` } },
        ];
      }

      // Handle sorting
      let order = [
        ['receipt_date', 'DESC'],
        ['created_at', 'DESC'],
      ];
      if (filters.sortField) {
        const sortOrder = filters.sortOrder === 1 ? 'ASC' : 'DESC';
        // Map frontend field names to database column names
        const fieldMapping = {
          receipt_number: 'receipt_number',
          receipt_date: 'receipt_date',
          'supplier.name': 'supplier.name',
          total_items: 'total_items',
          total_amount: 'total_amount',
          status: 'status',
        };

        const dbField = fieldMapping[filters.sortField];
        if (dbField) {
          if (dbField.includes('.')) {
            // Handle associated field sorting
            const [association, field] = dbField.split('.');
            order = [[{ model: Supplier, as: association }, field, sortOrder]];
          } else {
            order = [[dbField, sortOrder]];
          }
        }
      }

      const receipts = await StockReceipt.findAll({
        where,
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'contact_person', 'phone'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username'],
          },
        ],
        order,
      });

      // Convert Sequelize instances to plain objects to avoid cloning issues
      const plainReceipts = receipts.map((receipt) => receipt.toJSON());

      return { success: true, data: plainReceipts };
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get receipt by ID with all entries
   */
  async getReceiptById(id) {
    try {
      const receipt = await StockReceipt.findByPk(id, {
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'contact_person', 'phone', 'email', 'address'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email'],
          },
          {
            model: StockEntry,
            as: 'entries',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'barcode'],
              },
            ],
            order: [['id', 'ASC']],
          },
        ],
      });

      if (!receipt) {
        return { success: false, error: 'Receipt not found' };
      }

      // Convert to plain object to avoid cloning issues
      const plainReceipt = receipt.toJSON();

      return { success: true, data: plainReceipt };
    } catch (error) {
      console.error('Error fetching receipt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update stock receipt (draft only)
   */
  async updateReceipt(id, data) {
    const transaction = await sequelize.transaction();

    try {
      const receipt = await StockReceipt.findByPk(id, { transaction });

      if (!receipt) {
        throw new Error('Receipt not found');
      }

      if (receipt.status !== 'draft') {
        throw new Error('Only draft receipts can be updated');
      }

      const { header, entries } = data;

      // Update receipt header
      await receipt.update(
        {
          supplier_id: header.supplierId,
          receipt_date: header.receiptDate,
          supplier_invoice_number: header.supplierInvoiceNumber || null,
          supplier_invoice_date: header.supplierInvoiceDate || null,
          notes: header.notes || null,
          status: header.status || 'draft',
        },
        { transaction }
      );

      // Delete existing entries
      await StockEntry.destroy({
        where: { receipt_id: id },
        transaction,
      });

      let totalItems = 0;
      let totalAmount = 0;

      // Create new entries
      for (const entry of entries) {
        // Validate free quantity
        const freeQuantity = entry.freeQuantity || 0;
        if (freeQuantity < 0) {
          throw new Error('Free quantity cannot be negative');
        }

        // Calculate total quantity (purchased + free)
        const totalQuantity = entry.quantity + freeQuantity;

        await StockEntry.create(
          {
            product_id: entry.productId,
            supplier_id: header.supplierId,
            receipt_id: receipt.id,
            batch_number: entry.batchNumber,
            quantity_received: entry.quantity,
            free_quantity: freeQuantity,
            quantity_remaining: totalQuantity,
            cost_price: entry.costPrice,
            selling_price: entry.sellingPrice,
            expiry_date: entry.expiryDate || null,
            entry_date: header.receiptDate,
            notes: entry.notes || null,
          },
          { transaction }
        );

        totalItems += 1;
        // Only calculate cost for purchased items, not free items
        totalAmount += parseFloat(entry.costPrice) * parseInt(entry.quantity);
      }

      // Update receipt totals
      await receipt.update(
        {
          total_items: totalItems,
          total_amount: totalAmount,
        },
        { transaction }
      );

      await transaction.commit();

      // Convert to plain object to avoid cloning issues
      const plainReceipt = receipt.toJSON();

      return {
        success: true,
        data: plainReceipt,
        message: 'Stock receipt updated successfully',
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating stock receipt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel stock receipt
   */
  async cancelReceipt(id) {
    const transaction = await sequelize.transaction();

    try {
      const receipt = await StockReceipt.findByPk(id, { transaction });

      if (!receipt) {
        throw new Error('Receipt not found');
      }

      if (receipt.status === 'cancelled') {
        throw new Error('Receipt is already cancelled');
      }

      // Check if any stock has been sold
      const entries = await StockEntry.findAll({
        where: { receipt_id: id },
        transaction,
      });

      for (const entry of entries) {
        // Total quantity includes purchased + free items
        const totalReceived = entry.quantity_received + (entry.free_quantity || 0);
        if (entry.quantity_remaining < totalReceived) {
          throw new Error(
            `Cannot cancel: Stock from this receipt has been sold (Batch: ${entry.batch_number})`
          );
        }
      }

      // Update receipt status
      await receipt.update({ status: 'cancelled' }, { transaction });

      // Set all stock entries quantity to 0
      await StockEntry.update(
        { quantity_remaining: 0 },
        {
          where: { receipt_id: id },
          transaction,
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Stock receipt cancelled successfully',
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Error cancelling receipt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get receipts by supplier
   */
  async getReceiptsBySupplier(supplierId) {
    try {
      const receipts = await StockReceipt.findAll({
        where: { supplier_id: supplierId },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name'],
          },
        ],
        order: [['receipt_date', 'DESC']],
      });

      // Convert to plain objects to avoid cloning issues
      const plainReceipts = receipts.map((receipt) => receipt.toJSON());

      return { success: true, data: plainReceipts };
    } catch (error) {
      console.error('Error fetching supplier receipts:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new StockReceiptController();
