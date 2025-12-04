import { Op } from 'sequelize';
import { Supplier } from '../database/models/index.js';

class SupplierController {
  /**
   * Get all suppliers
   * @param {Object} params - Query parameters
   * @returns {Object} Result with success status and data
   */
  async getAllSuppliers(params = {}) {
    try {
      const { status, search, sortField, sortOrder } = params;

      const whereClause = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Search by name, contact person, email, or phone
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { contact_person: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ];
      }

      // Handle sorting
      let order = [['created_at', 'DESC']];
      if (sortField) {
        const sortOrderValue = sortOrder === 1 ? 'ASC' : 'DESC';
        // Map frontend field names to database column names
        const fieldMapping = {
          id: 'id',
          name: 'name',
          contact_person: 'contact_person',
          email: 'email',
          phone: 'phone',
          address: 'address',
          status: 'status',
        };

        const dbField = fieldMapping[sortField];
        if (dbField) {
          order = [[dbField, sortOrderValue]];
        }
      }

      const suppliers = await Supplier.findAll({
        where: whereClause,
        order,
        raw: true,
      });

      return {
        success: true,
        data: suppliers,
      };
    } catch (error) {
      console.error('SupplierController.getAllSuppliers error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch suppliers',
      };
    }
  }

  /**
   * Get supplier by ID
   * @param {number} id - Supplier ID
   * @returns {Object} Result with success status and data
   */
  async getSupplierById(id) {
    try {
      if (!id) {
        return {
          success: false,
          message: 'Supplier ID is required',
        };
      }

      const supplier = await Supplier.findByPk(id, { raw: true });

      if (!supplier) {
        return {
          success: false,
          message: 'Supplier not found',
        };
      }

      return {
        success: true,
        data: supplier,
      };
    } catch (error) {
      console.error('SupplierController.getSupplierById error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch supplier',
      };
    }
  }

  /**
   * Create new supplier
   * @param {Object} data - Supplier data
   * @returns {Object} Result with success status and data
   */
  async createSupplier(data) {
    try {
      const { name, contact_person, email, phone, address, status } = data;

      // Validate required fields
      if (!name) {
        return {
          success: false,
          message: 'Supplier name is required',
        };
      }

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return {
            success: false,
            message: 'Invalid email format',
          };
        }

        // Check if email already exists
        const existingEmail = await Supplier.findOne({
          where: { email },
        });
        if (existingEmail) {
          return {
            success: false,
            message: 'Email address already exists',
          };
        }
      }

      // Check if phone already exists
      if (phone) {
        const existingPhone = await Supplier.findOne({
          where: { phone },
        });
        if (existingPhone) {
          return {
            success: false,
            message: 'Phone number already exists',
          };
        }
      }

      const supplier = await Supplier.create({
        name,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        status: status || 'active',
      });

      return {
        success: true,
        data: supplier.get({ plain: true }),
        message: 'Supplier created successfully',
      };
    } catch (error) {
      console.error('SupplierController.createSupplier error:', error);

      // Handle unique constraint errors
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path;
        if (field === 'email') {
          return {
            success: false,
            message: 'Email address already exists',
          };
        } else if (field === 'phone') {
          return {
            success: false,
            message: 'Phone number already exists',
          };
        }
      }

      return {
        success: false,
        message: error.message || 'Failed to create supplier',
      };
    }
  }

  /**
   * Update supplier
   * @param {number} id - Supplier ID
   * @param {Object} data - Updated supplier data
   * @returns {Object} Result with success status and data
   */
  async updateSupplier(id, data) {
    try {
      if (!id) {
        return {
          success: false,
          message: 'Supplier ID is required',
        };
      }

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return {
          success: false,
          message: 'Supplier not found',
        };
      }

      const { name, contact_person, email, phone, address, status } = data;

      // Validate required fields
      if (name !== undefined && !name) {
        return {
          success: false,
          message: 'Supplier name is required',
        };
      }

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return {
            success: false,
            message: 'Invalid email format',
          };
        }

        // Check if email already exists (excluding current supplier)
        const existingEmail = await Supplier.findOne({
          where: {
            email,
            id: { [Op.ne]: id },
          },
        });
        if (existingEmail) {
          return {
            success: false,
            message: 'Email address already exists',
          };
        }
      }

      // Check if phone already exists (excluding current supplier)
      if (phone) {
        const existingPhone = await Supplier.findOne({
          where: {
            phone,
            id: { [Op.ne]: id },
          },
        });
        if (existingPhone) {
          return {
            success: false,
            message: 'Phone number already exists',
          };
        }
      }

      await supplier.update({
        name: name !== undefined ? name : supplier.name,
        contact_person: contact_person !== undefined ? contact_person : supplier.contact_person,
        email: email !== undefined ? email : supplier.email,
        phone: phone !== undefined ? phone : supplier.phone,
        address: address !== undefined ? address : supplier.address,
        status: status !== undefined ? status : supplier.status,
      });

      return {
        success: true,
        data: supplier.get({ plain: true }),
        message: 'Supplier updated successfully',
      };
    } catch (error) {
      console.error('SupplierController.updateSupplier error:', error);

      // Handle unique constraint errors
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path;
        if (field === 'email') {
          return {
            success: false,
            message: 'Email address already exists',
          };
        } else if (field === 'phone') {
          return {
            success: false,
            message: 'Phone number already exists',
          };
        }
      }

      return {
        success: false,
        message: error.message || 'Failed to update supplier',
      };
    }
  }

  /**
   * Delete supplier (soft delete by setting status to inactive)
   * @param {number} id - Supplier ID
   * @returns {Object} Result with success status
   */
  async deleteSupplier(id) {
    try {
      if (!id) {
        return {
          success: false,
          message: 'Supplier ID is required',
        };
      }

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return {
          success: false,
          message: 'Supplier not found',
        };
      }

      await supplier.update({ status: 'inactive' });

      return {
        success: true,
        message: 'Supplier deleted successfully',
      };
    } catch (error) {
      console.error('SupplierController.deleteSupplier error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete supplier',
      };
    }
  }

  /**
   * Get active suppliers only
   * @returns {Object} Result with success status and data
   */
  async getActiveSuppliers() {
    try {
      const suppliers = await Supplier.findAll({
        where: { status: 'active' },
        order: [['created_at', 'DESC']],
        raw: true,
      });

      return {
        success: true,
        data: suppliers,
      };
    } catch (error) {
      console.error('SupplierController.getActiveSuppliers error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch active suppliers',
      };
    }
  }

  /**
   * Get products from supplier
   * @param {number} supplierId - Supplier ID
   * @returns {Object} Result with success status and products data
   */
  async getProductsFromSupplier(supplierId) {
    try {
      if (!supplierId) {
        return {
          success: false,
          message: 'Supplier ID is required',
        };
      }

      const { StockEntry, Product, Category, ProductType } = await import(
        '../database/models/index.js'
      );

      const stockEntries = await StockEntry.findAll({
        where: { supplier_id: supplierId },
        attributes: ['product_id'],
        group: ['product_id'],
        raw: true,
      });

      // Get unique products
      const productIds = [...new Set(stockEntries.map((entry) => entry.product_id))];

      const products = await Product.findAll({
        where: { id: productIds },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
          {
            model: ProductType,
            as: 'productType',
            attributes: ['id', 'name'],
          },
        ],
        order: [['name', 'ASC']],
      });

      // Convert to plain objects and flatten category/type names
      const plainProducts = products.map((product) => {
        const plain = product.toJSON();
        return {
          id: plain.id,
          name: plain.name,
          barcode: plain.barcode || '-',
          category: plain.category?.name || '-',
          type: plain.productType?.name || '-',
        };
      });

      return {
        success: true,
        data: plainProducts,
      };
    } catch (error) {
      console.error('SupplierController.getProductsFromSupplier error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch products from supplier',
        data: [],
      };
    }
  }
}

export default new SupplierController();
