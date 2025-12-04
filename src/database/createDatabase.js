import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { syncDatabase } from './sync.js';

dotenv.config();

/**
 * Create Database and Tables Script
 * Creates the database if it doesn't exist, then runs sync to create tables and seed data
 */
async function createDatabaseAndTables() {
  let connection;

  try {
    console.log('Creating database if not exists...');

    // Connect to MySQL without database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '1234',
    });

    // Create database
    const dbName = process.env.DB_NAME || 'pharmacy_pos';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    console.log(`✓ Database '${dbName}' created successfully (or already exists)`);

    await connection.end();

    // Now sync tables and seed data
    await syncDatabase();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

createDatabaseAndTables();
