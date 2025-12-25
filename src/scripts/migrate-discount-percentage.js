import sequelize from '../config/database.js';

async function addDiscountPercentageColumn() {
  try {
    console.log('Starting migration: Adding discount_percentage column to sales table...');

    // Add discount_percentage column
    await sequelize.query(`
      ALTER TABLE sales 
      ADD COLUMN discount_percentage DECIMAL(5, 2) NULL 
      COMMENT 'Discount as percentage (0-100). If NULL, discount column contains fixed Rs. value (legacy data)' 
      AFTER subtotal
    `);

    // Add index for better query performance
    await sequelize.query(`
      CREATE INDEX idx_discount_percentage ON sales (discount_percentage)
    `);

    console.log('✅ Migration completed successfully!');
    console.log('   - Added discount_percentage column to sales table');
    console.log('   - Added index on discount_percentage');
    console.log('   - Existing sales data preserved (will use fixed discount values)');
    console.log('   - New sales will use percentage-based discounts');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Check if column already exists
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️  Column already exists. No action needed.');
      process.exit(0);
    }

    process.exit(1);
  }
}

// Run migration
addDiscountPercentageColumn();
