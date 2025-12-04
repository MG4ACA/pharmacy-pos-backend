import { Op } from 'sequelize';
import { Category, Product, ProductType, StockEntry } from '../database/models/index.js';

class ProductController {
  /**
   * Get all products with optional filters and pagination
   */
  static async getAllProducts(params = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        category_id = null,
        product_type_id = null,
        status = 'active',
        sortField = 'created_at',
        sortOrder = 'DESC',
      } = params;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};

      if (status) {
        where.status = status;
      }

      if (category_id) {
        where.category_id = category_id;
      }

      if (product_type_id) {
        where.product_type_id = product_type_id;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { barcode: { [Op.like]: `%${search}%` } },
          { upc: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // Field mapping for sorting
      const fieldMapping = {
        name: 'name',
        reorder_level: 'reorder_level',
        'productType.name': 'productType.name',
        'category.name': 'category.name',
        status: 'status',
        created_at: 'created_at',
      };

      // Build order clause
      let order = [['created_at', 'DESC']];
      if (sortField && fieldMapping[sortField]) {
        const orderDirection = sortOrder === '1' ? 'ASC' : 'DESC';
        if (sortField.includes('.')) {
          // Handle associated field sorting
          const [association, field] = sortField.split('.');
          order = [
            [
              { model: association === 'productType' ? ProductType : Category, as: association },
              field,
              orderDirection,
            ],
          ];
        } else {
          order = [[sortField, orderDirection]];
        }
      }

      // Get products with associations
      const { count, rows } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: ProductType,
            as: 'productType',
            attributes: ['id', 'name'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
          {
            model: StockEntry,
            as: 'stockEntries',
            attributes: ['quantity_remaining'],
            where: { quantity_remaining: { [Op.gt]: 0 } },
            required: false,
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
      });

      // Calculate total stock for each product
      const products = rows.map((product) => {
        const plainProduct = product.toJSON();
        const totalStock =
          plainProduct.stockEntries?.reduce((sum, entry) => sum + entry.quantity_remaining, 0) || 0;

        delete plainProduct.stockEntries;

        return {
          ...plainProduct,
          total_stock: totalStock,
          is_low_stock: totalStock <= (plainProduct.reorder_level || 0),
        };
      });

      return {
        success: true,
        data: products,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error('Get all products error:', error);
      return {
        success: false,
        message: 'Failed to fetch products',
        error: error.message,
      };
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(id) {
    try {
      const product = await Product.findByPk(id, {
        include: [
          {
            model: ProductType,
            as: 'productType',
            attributes: ['id', 'name'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
          {
            model: StockEntry,
            as: 'stockEntries',
            attributes: ['quantity_remaining', 'selling_price', 'expiry_date'],
            where: { quantity_remaining: { [Op.gt]: 0 } },
            required: false,
          },
        ],
      });

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      const plainProduct = product.toJSON();
      const totalStock =
        plainProduct.stockEntries?.reduce((sum, entry) => sum + entry.quantity_remaining, 0) || 0;

      return {
        success: true,
        data: {
          ...plainProduct,
          total_stock: totalStock,
          is_low_stock: totalStock <= (plainProduct.reorder_level || 0),
        },
      };
    } catch (error) {
      console.error('Get product by ID error:', error);
      return {
        success: false,
        message: 'Failed to fetch product',
        error: error.message,
      };
    }
  }

  /**
   * Create new product
   */
  static async createProduct(data) {
    try {
      const {
        name,
        barcode,
        description,
        product_type_id,
        category_id,
        reorder_level,
        status = 'active',
      } = data;

      // Validate required fields
      if (!name || !product_type_id || !category_id) {
        return {
          success: false,
          message: 'Name, product type, and category are required',
        };
      }

      // Check if barcode already exists
      if (barcode) {
        const existingProduct = await Product.findOne({ where: { barcode } });
        if (existingProduct) {
          return {
            success: false,
            message: 'A product with this barcode already exists',
          };
        }
      }

      // Create product
      const product = await Product.create({
        name: name.trim(),
        barcode: barcode ? barcode.trim() : null,
        description: description ? description.trim() : null,
        product_type_id,
        category_id,
        reorder_level: reorder_level || 10,
        status,
      });

      // Fetch created product with associations
      const createdProduct = await this.getProductById(product.id);

      return {
        success: true,
        message: 'Product created successfully',
        data: createdProduct.data,
      };
    } catch (error) {
      console.error('Create product error:', error);
      return {
        success: false,
        message: 'Failed to create product',
        error: error.message,
      };
    }
  }

  /**
   * Update product
   */
  static async updateProduct(id, data) {
    try {
      const product = await Product.findByPk(id);

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      const { name, barcode, description, product_type_id, category_id, reorder_level, status } =
        data;

      // Check if barcode already exists (excluding current product)
      if (barcode && barcode !== product.barcode) {
        const existingProduct = await Product.findOne({
          where: {
            barcode,
            id: { [Op.ne]: id },
          },
        });

        if (existingProduct) {
          return {
            success: false,
            message: 'A product with this barcode already exists',
          };
        }
      }

      // Update product
      await product.update({
        name: name ? name.trim() : product.name,
        barcode: barcode ? barcode.trim() : product.barcode,
        description:
          description !== undefined
            ? description
              ? description.trim()
              : null
            : product.description,
        product_type_id: product_type_id || product.product_type_id,
        category_id: category_id || product.category_id,
        reorder_level: reorder_level !== undefined ? reorder_level : product.reorder_level,
        status: status || product.status,
      });

      // Fetch updated product with associations
      const updatedProduct = await this.getProductById(id);

      return {
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct.data,
      };
    } catch (error) {
      console.error('Update product error:', error);
      return {
        success: false,
        message: 'Failed to update product',
        error: error.message,
      };
    }
  }

  /**
   * Delete product (soft delete by setting status to inactive)
   */
  static async deleteProduct(id) {
    try {
      const product = await Product.findByPk(id);

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      // Soft delete by setting status to inactive
      await product.update({ status: 'inactive' });

      return {
        success: true,
        message: 'Product deleted successfully',
      };
    } catch (error) {
      console.error('Delete product error:', error);
      return {
        success: false,
        message: 'Failed to delete product',
        error: error.message,
      };
    }
  }

  /**
   * Search products by name or barcode
   */
  static async searchProducts(query) {
    try {
      if (!query || query.trim().length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      const products = await Product.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { barcode: { [Op.like]: `%${query}%` } },
            { upc: { [Op.like]: `%${query}%` } },
          ],
        },
        include: [
          {
            model: ProductType,
            as: 'productType',
            attributes: ['id', 'name'],
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
          {
            model: StockEntry,
            as: 'stockEntries',
            attributes: ['quantity_remaining', 'selling_price'],
            where: { quantity_remaining: { [Op.gt]: 0 } },
            required: false,
          },
        ],
        limit: 20,
        order: [['name', 'ASC']],
      });

      const results = products.map((product) => {
        const plainProduct = product.toJSON();
        const totalStock =
          plainProduct.stockEntries?.reduce((sum, entry) => sum + entry.quantity_remaining, 0) || 0;

        const avgPrice =
          plainProduct.stockEntries?.length > 0
            ? plainProduct.stockEntries.reduce(
                (sum, entry) => sum + parseFloat(entry.selling_price),
                0
              ) / plainProduct.stockEntries.length
            : 0;

        delete plainProduct.stockEntries;

        return {
          ...plainProduct,
          total_stock: totalStock,
          average_selling_price: avgPrice,
        };
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('Search products error:', error);
      return {
        success: false,
        message: 'Failed to search products',
        error: error.message,
      };
    }
  }
}

export default ProductController;
