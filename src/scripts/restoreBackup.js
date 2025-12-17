import dotenv from 'dotenv';
import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const restoreBackup = async (backupFileName) => {
  let connection;

  try {
    console.log('🔄 Starting database restore...\n');

    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true, // Important: allows multiple SQL statements
    });

    console.log('✅ Connected to MySQL');

    // Read the backup file
    const backupDir = path.join(__dirname, '../../backups');
    const backupPath = path.join(backupDir, backupFileName);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    console.log(`📂 Reading backup file: ${backupFileName}`);
    const sqlContent = fs.readFileSync(backupPath, 'utf8');

    console.log(`📊 Backup file size: ${(sqlContent.length / 1024).toFixed(2)} KB`);

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'pharmacy_pos';
    console.log(`🎯 Creating/checking database: ${dbName}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);

    // Execute the backup SQL content
    console.log('🔄 Executing SQL statements...');
    await connection.query(sqlContent);

    console.log('\n✅ Database restored successfully!');
    console.log(`📦 Restored from: ${backupFileName}`);

    // Verify restoration
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ Total tables restored: ${tables.length}`);
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔒 Connection closed');
    }
  }
};

// Get backup filename from command line argument
const backupFileName = process.argv[2];

if (!backupFileName) {
  console.error('❌ Error: Please provide backup filename');
  console.log('\nUsage: npm run db:restore <backup-filename>');
  console.log('Example: npm run db:restore backup_pharmacy_pos_2025-12-17_04-52-07.sql');
  process.exit(1);
}

restoreBackup(backupFileName)
  .then(() => {
    console.log('\n✨ Restore completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Restore failed:', error);
    process.exit(1);
  });
