import bcrypt from 'bcrypt';
import { Category, ProductType, Supplier, User } from './models/index.js';
import { categories } from './seeders/categories.js';
import { productTypes } from './seeders/productTypes.js';

/**
 * Seed Database with Initial Data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Check if data already exists
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('⚠️  Database already has data. Skipping seed.');
      process.exit(0);
    }

    // Create default admin user
    console.log('Creating default admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      full_name: 'System Administrator',
      role: 'admin',
      status: 'active',
    });
    console.log('✓ Admin user created (username: admin, password: admin123)');

    // Create default categories
    console.log('Creating default categories...');
    const createdCategories = await Category.bulkCreate(categories);
    console.log(`✓ Created ${createdCategories.length} categories`);

    // Create default product types
    console.log('Creating default product types...');
    const createdProductTypes = await ProductType.bulkCreate(productTypes);
    console.log(`✓ Created ${createdProductTypes.length} product types`);

    // Create sample supplier
    console.log('Creating sample supplier...');
    await Supplier.create({
      name: 'Sample Supplier Inc.',
      contact_person: 'John Doe',
      phone: '123-456-7890',
      email: 'contact@samplesupplier.com',
      address: '123 Supplier Street',
      status: 'active',
    });
    console.log('✓ Created sample supplier');

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Database seeded successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Default Login Credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the admin password after first login!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
