import bcrypt from 'bcrypt';
import { Category, ProductType, Supplier, User } from './models/index.js';

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
    const categories = await Category.bulkCreate([
      { name: 'General Medicine', description: 'General purpose medicines' },
      { name: 'Antibiotics', description: 'Antibiotic medications' },
      { name: 'Pain Relief', description: 'Pain relief medications' },
      { name: 'Vitamins & Supplements', description: 'Vitamins and dietary supplements' },
      { name: 'First Aid', description: 'First aid supplies' },
      { name: 'Personal Care', description: 'Personal care products' },
    ]);
    console.log(`✓ Created ${categories.length} categories`);

    // Create default product types
    console.log('Creating default product types...');
    const productTypes = await ProductType.bulkCreate([
      { name: 'Tablet', description: 'Tablet form medication' },
      { name: 'Capsule', description: 'Capsule form medication' },
      { name: 'Syrup', description: 'Liquid syrup medication' },
      { name: 'Injection', description: 'Injectable medication' },
      { name: 'Cream/Ointment', description: 'Topical cream or ointment' },
      { name: 'Drops', description: 'Eye/Ear/Nose drops' },
    ]);
    console.log(`✓ Created ${productTypes.length} product types`);

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
