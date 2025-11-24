import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const SaleItem = sequelize.define(
  'SaleItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sale_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sales',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    stock_entry_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stock_entries',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
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
    tableName: 'sale_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (saleItem) => {
        saleItem.subtotal = saleItem.quantity * saleItem.unit_price;
      },
      beforeUpdate: (saleItem) => {
        if (saleItem.changed('quantity') || saleItem.changed('unit_price')) {
          saleItem.subtotal = saleItem.quantity * saleItem.unit_price;
        }
      },
    },
  }
);

export default SaleItem;
