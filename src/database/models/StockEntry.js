import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const StockEntry = sequelize.define(
  'StockEntry',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id',
      },
    },
    receipt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'stock_receipts',
        key: 'id',
      },
    },
    batch_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    quantity_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    quantity_remaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    selling_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    entry_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'stock_entries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (stockEntry) => {
        stockEntry.quantity_remaining = stockEntry.quantity_received;
      },
    },
  }
);

export default StockEntry;
