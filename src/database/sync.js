import { testConnection } from '../config/database.js';
import { Category, ProductType, sequelize, User } from './models/index.js';
import { categories } from './seeders/categories.js';
import { productTypes } from './seeders/productTypes.js';

const syncDatabase = async () => {
  try {
    console.log('Starting database synchronization...\n');

    // Test connection first
    const connectionResult = await testConnection();
    if (!connectionResult.success) {
      throw new Error(`Database connection failed: ${connectionResult.message}`);
    }

    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✓ All models synchronized successfully\n');

    // Seed ProductTypes
    console.log('Seeding Product Types...');
    for (const type of productTypes) {
      await ProductType.findOrCreate({
        where: { name: type.name },
        defaults: type,
      });
    }
    console.log(`✓ ${productTypes.length} Product Types seeded\n`);

    // Seed Categories
    console.log('Seeding Categories...');
    for (const category of categories) {
      await Category.findOrCreate({
        where: { name: category.name },
        defaults: category,
      });
    }
    console.log(`✓ ${categories.length} Categories seeded\n`);

    // Check if default admin user exists
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      console.log('Creating default admin user...');
      await User.create({
        username: 'admin',
        password: 'admin123',
        full_name: 'System Administrator',
        email: 'admin@pharmacy.local',
        phone: null,
        status: 'active',
      });
      console.log('✓ Default admin user created (username: admin, password: admin123)\n');
    } else {
      console.log('✓ Default admin user already exists\n');
    }

    console.log('===================================');
    console.log('Database setup completed successfully!');
    console.log('===================================\n');
    console.log('Database: pharmacy_pos');
    console.log('Host: localhost:3306');
    console.log('User: root');
    console.log('\nTables created:');
    console.log('- users');
    console.log('- product_types');
    console.log('- categories');
    console.log('- suppliers');
    console.log('- products');
    console.log('- stock_entries');
    console.log('- sales');
    console.log('- sale_items');
    console.log('\nDefault credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Database synchronization failed:');
    console.error(error.message);
    console.error('\nPlease ensure:');
    console.error('1. MySQL server is running');
    console.error('2. Database "pharmacy_pos" exists');
    console.error('3. Credentials in .env are correct');
    console.error('\nYou can create the database manually:');
    console.error('CREATE DATABASE pharmacy_pos;');
    process.exit(1);
  }
};

syncDatabase();
