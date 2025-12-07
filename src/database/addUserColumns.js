import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function addUserColumns() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pharmacy_pos',
    });

    console.log('✓ Connected to database');

    // Check if role column exists
    const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");

    if (columns.length === 0) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user' AFTER phone"
      );
      console.log('✓ Added role column');
    } else {
      console.log('✓ role column already exists');
    }

    // Check if last_login column exists
    const [loginColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'last_login'");

    if (loginColumns.length === 0) {
      await connection.query('ALTER TABLE users ADD COLUMN last_login DATETIME NULL AFTER status');
      console.log('✓ Added last_login column');
    } else {
      console.log('✓ last_login column already exists');
    }

    console.log('\n✓ Database migration completed successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addUserColumns();
