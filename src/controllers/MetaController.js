import { Category, ProductType } from '../database/models/index.js';

class MetaController {
  /**
   * Get all product types
   */
  static async getAllProductTypes() {
    try {
      const productTypes = await ProductType.findAll({
        where: { status: 'active' },
        order: [['name', 'ASC']],
        raw: true, // Returns plain objects instead of Sequelize instances
      });

      return {
        success: true,
        productTypes: productTypes,
      };
    } catch (error) {
      console.error('Get product types error:', error);
      return {
        success: false,
        message: 'Failed to fetch product types',
        productTypes: [],
      };
    }
  }

  /**
   * Get all categories
   */
  static async getAllCategories() {
    try {
      const categories = await Category.findAll({
        where: { status: 'active' },
        order: [['name', 'ASC']],
        raw: true, // Returns plain objects instead of Sequelize instances
      });

      return {
        success: true,
        categories: categories,
      };
    } catch (error) {
      console.error('Get categories error:', error);
      return {
        success: false,
        message: 'Failed to fetch categories',
        categories: [],
      };
    }
  }
}

export default MetaController;
