#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../config/database.js';
import seedProductsFromCsv from './seeders/productsFromCsv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    console.log('Connecting to database for product seeding...');
    await sequelize.authenticate();
    console.log('Connected. Ensuring tables exist...');

    // Create tables if they don't exist. For a dropped database you should run sync first.
    await sequelize.sync();

    const csvPath = path.resolve(__dirname, './items_export_enriched_camcase.csv');
    const result = await seedProductsFromCsv(csvPath);

    console.log('Products seeding finished. Summary:');
    console.log(`  Created: ${result.created}`);
    console.log(`  Skipped: ${result.skipped}`);
    if (result.errors && result.errors.length) {
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.slice(0, 10).forEach((e) => console.error('   -', e.row, ':', e.error));
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

run();
