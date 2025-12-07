import sequelize from '../../config/database.js';
import Category from './Category.js';
import Notification from './Notification.js';
import NotificationPreference from './NotificationPreference.js';
import Product from './Product.js';
import ProductType from './ProductType.js';
import Sale from './Sale.js';
import SaleItem from './SaleItem.js';
import StockEntry from './StockEntry.js';
import StockReceipt from './StockReceipt.js';
import Supplier from './Supplier.js';
import User from './User.js';

// Define associations

// Product associations
Product.belongsTo(ProductType, {
  foreignKey: 'product_type_id',
  as: 'productType',
});
ProductType.hasMany(Product, {
  foreignKey: 'product_type_id',
  as: 'products',
});

Product.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
});
Category.hasMany(Product, {
  foreignKey: 'category_id',
  as: 'products',
});

// StockEntry associations
StockEntry.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
});
Product.hasMany(StockEntry, {
  foreignKey: 'product_id',
  as: 'stockEntries',
});

StockEntry.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier',
});
Supplier.hasMany(StockEntry, {
  foreignKey: 'supplier_id',
  as: 'stockEntries',
});

StockEntry.belongsTo(StockReceipt, {
  foreignKey: 'receipt_id',
  as: 'receipt',
});
StockReceipt.hasMany(StockEntry, {
  foreignKey: 'receipt_id',
  as: 'entries',
});

// StockReceipt associations
StockReceipt.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier',
});
Supplier.hasMany(StockReceipt, {
  foreignKey: 'supplier_id',
  as: 'receipts',
});

StockReceipt.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});
User.hasMany(StockReceipt, {
  foreignKey: 'created_by',
  as: 'receipts',
});

// Sale associations
Sale.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(Sale, {
  foreignKey: 'user_id',
  as: 'sales',
});

Sale.hasMany(SaleItem, {
  foreignKey: 'sale_id',
  as: 'saleItems',
});
SaleItem.belongsTo(Sale, {
  foreignKey: 'sale_id',
  as: 'sale',
});

// SaleItem associations
SaleItem.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
});
Product.hasMany(SaleItem, {
  foreignKey: 'product_id',
  as: 'saleItems',
});

SaleItem.belongsTo(StockEntry, {
  foreignKey: 'stock_entry_id',
  as: 'stockEntry',
});
StockEntry.hasMany(SaleItem, {
  foreignKey: 'stock_entry_id',
  as: 'saleItems',
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
});

// NotificationPreference associations
NotificationPreference.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasOne(NotificationPreference, {
  foreignKey: 'user_id',
  as: 'notificationPreference',
});

export {
  Category,
  Notification,
  NotificationPreference,
  Product,
  ProductType,
  Sale,
  SaleItem,
  sequelize,
  StockEntry,
  StockReceipt,
  Supplier,
  User,
};
