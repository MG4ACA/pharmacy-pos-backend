-- ============================================================
-- PHARMACY POS DATABASE INITIALIZATION SCRIPT
-- ============================================================
-- This script creates the complete database schema and populates
-- it with initial seed data for the Pharmacy POS System.
-- Database: pharmacy_pos
-- MySQL Version: 8.0+
-- Generated: 2025-11-27
-- ============================================================

-- Drop database if exists (CAUTION: This will delete all existing data)
DROP DATABASE IF EXISTS pharmacy_pos;

-- Create database
CREATE DATABASE pharmacy_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE pharmacy_pos;

-- ============================================================
-- TABLE: users
-- Stores user accounts for the system
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: categories
-- Product categories (Medicine, Beverage, Snack, etc.)
-- ============================================================
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: product_types
-- Product types (Tablet, Syrup, Bottle, Packet, etc.)
-- ============================================================
CREATE TABLE product_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: suppliers
-- Supplier information for stock receipts
-- ============================================================
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL UNIQUE,
  address TEXT DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_email (email),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: products
-- Product inventory master data
-- ============================================================
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  barcode VARCHAR(50) DEFAULT NULL UNIQUE,
  upc VARCHAR(50) DEFAULT NULL COMMENT 'Original UPC/EAN/ISBN from import CSV',
  product_type_id INT NOT NULL,
  category_id INT NOT NULL,
  description TEXT DEFAULT NULL,
  reorder_level INT DEFAULT 10 NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_name (name),
  INDEX idx_barcode (barcode),
  INDEX idx_upc (upc),
  INDEX idx_status (status),
  INDEX idx_product_type (product_type_id),
  INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: stock_receipts
-- Stock receipt headers (delivery records from suppliers)
-- ============================================================
CREATE TABLE stock_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  receipt_date DATE NOT NULL,
  supplier_invoice_number VARCHAR(100) DEFAULT NULL,
  supplier_invoice_date DATE DEFAULT NULL,
  total_items INT DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT DEFAULT NULL,
  status ENUM('draft', 'completed', 'cancelled') DEFAULT 'draft',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_receipt_number (receipt_number),
  INDEX idx_supplier (supplier_id),
  INDEX idx_receipt_date (receipt_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: stock_entries
-- Stock entries (batch-level inventory tracking with FIFO)
-- Updated: 2025-12-17 - Added free items tracking
-- ============================================================
CREATE TABLE stock_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  supplier_id INT DEFAULT NULL,
  receipt_id INT DEFAULT NULL,
  batch_number VARCHAR(50) NOT NULL,
  quantity_received INT NOT NULL,
  free_quantity INT NOT NULL DEFAULT 0 COMMENT 'Number of free items received from supplier (e.g., buy 12 get 2 free)',
  quantity_remaining INT NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  expiry_date DATE DEFAULT NULL,
  entry_date DATE NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id) ON DELETE SET NULL,
  INDEX idx_product (product_id),
  INDEX idx_batch_number (batch_number),
  INDEX idx_supplier (supplier_id),
  INDEX idx_receipt (receipt_id),
  INDEX idx_expiry_date (expiry_date),
  INDEX idx_entry_date (entry_date),
  INDEX idx_quantity_remaining (quantity_remaining),
  INDEX idx_product_remaining (product_id, quantity_remaining),
  INDEX idx_free_quantity (free_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: sales
-- Sales transaction headers
-- ============================================================
CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  subtotal DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'card', 'other') DEFAULT 'cash' NOT NULL,
  payment_status ENUM('completed', 'pending', 'cancelled') DEFAULT 'completed' NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_user (user_id),
  INDEX idx_sale_date (sale_date),
  INDEX idx_payment_method (payment_method),
  INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: sale_items
-- Individual items in each sale transaction
-- Updated: 2025-12-17 - Added free items tracking
-- ============================================================
CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  stock_entry_id INT NOT NULL,
  quantity INT NOT NULL,
  is_free_item BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Indicates whether this item was sold from free stock',
  free_item_quantity INT NOT NULL DEFAULT 0 COMMENT 'Number of items in this sale that were from free stock',
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id) ON DELETE RESTRICT,
  INDEX idx_sale (sale_id),
  INDEX idx_product (product_id),
  INDEX idx_stock_entry (stock_entry_id),
  INDEX idx_is_free_item (is_free_item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA: Categories
-- ============================================================

INSERT INTO users (username, password, full_name, email, phone, status) VALUES
('admin', '$2b$10$4XqglvPuLTkfSvPhPl.XIeBjEWUMaBOsCDtYn6v.JeXIoatCUILF6', 'Administrator', 'admin@pharmacy.com', '+94771234567', 'active');

-- Note: The hashed password above is for 'admin123'
-- To generate a new bcrypt hash for a different password, use:
-- bcrypt.hashSync('your_password', 10);


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these queries after initialization to verify the setup:

-- Check all tables
-- SHOW TABLES;

-- Check categories
-- SELECT * FROM categories;

-- Check product types
-- SELECT * FROM product_types;

-- Check products
-- SELECT p.id, p.name, pt.name as type, c.name as category, p.status 
-- FROM products p 
-- JOIN product_types pt ON p.product_type_id = pt.id 
-- JOIN categories c ON p.category_id = c.id;

-- Check users
-- SELECT id, username, full_name, status FROM users;

-- Check suppliers
-- SELECT id, name, contact_person, phone, status FROM suppliers;

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 1. Default admin credentials:
--    Username: admin
--    Password: admin123
--    CHANGE THIS PASSWORD IMMEDIATELY after first login!
--
-- 2. All timestamps use system timezone
--
-- 3. Foreign keys enforce referential integrity
--
-- 4. Indexes are created for frequently queried columns
--
-- 5. To reset database, simply run this script again
--    (WARNING: All existing data will be lost)
--
-- 6. For production use:
--    - Change default admin password
--    - Add proper backup strategy
--    - Review and adjust user permissions
--    - Consider additional indexes based on usage patterns
--
-- 7. UPC column added to products table for CSV import support
--
-- 8. FIFO batch management handled via stock_entries table
--    - quantity_remaining tracks available stock per batch
--    - entry_date used for FIFO ordering (oldest first)
--    - free_quantity tracks promotional free items from suppliers
--    - quantity_remaining = quantity_received + free_quantity initially
--
-- 9. Stock receipt system links deliveries to batches
--    - receipt_id in stock_entries links to stock_receipts
--    - Atomic transaction handling in application layer
--
-- 10. All monetary values use DECIMAL(10,2) for precision
--
-- 11. Free items tracking (Added 2025-12-17):
--    - stock_entries.free_quantity: Count of free items from supplier
--    - sale_items.is_free_item: Boolean flag for free stock sales
--    - sale_items.free_item_quantity: Count of free items in this sale
--    - Enables dual profit calculation (with/without free items)
--    - Free items have zero cost but same selling price
--
-- ============================================================
-- END OF DATABASE INITIALIZATION SCRIPT
-- ============================================================
