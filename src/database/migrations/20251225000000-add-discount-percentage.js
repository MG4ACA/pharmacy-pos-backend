'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add discount_percentage column to sales table
    await queryInterface.addColumn('sales', 'discount_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      comment:
        'Discount as percentage (0-100). If NULL, discount column contains fixed Rs. value (legacy data)',
      after: 'subtotal',
    });

    // Add index for better query performance
    await queryInterface.addIndex('sales', ['discount_percentage'], {
      name: 'idx_discount_percentage',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('sales', 'idx_discount_percentage');

    // Remove column
    await queryInterface.removeColumn('sales', 'discount_percentage');
  },
};
