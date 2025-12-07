import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const NotificationPreference = sequelize.define(
  'NotificationPreference',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      unique: true,
    },
    // Low Stock Alerts
    low_stock_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      validate: {
        min: { args: [1], msg: 'Low stock threshold must be at least 1' },
      },
    },
    low_stock_frequency: {
      type: DataTypes.ENUM('realtime', 'daily', 'weekly'),
      defaultValue: 'realtime',
    },
    // Expiring Products Alerts
    expiring_products_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    expiring_products_days: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      validate: {
        min: { args: [1], msg: 'Expiring products days must be at least 1' },
      },
    },
    expiring_products_frequency: {
      type: DataTypes.ENUM('realtime', 'daily', 'weekly'),
      defaultValue: 'daily',
    },
    // Daily Sales Summary
    daily_sales_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    daily_sales_time: {
      type: DataTypes.TIME,
      defaultValue: '23:00:00',
    },
    // System Updates
    system_updates_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    system_updates_frequency: {
      type: DataTypes.ENUM('realtime', 'daily', 'weekly'),
      defaultValue: 'realtime',
    },
    // Payment Reminders
    payment_reminders_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    payment_reminders_frequency: {
      type: DataTypes.ENUM('realtime', 'daily', 'weekly'),
      defaultValue: 'daily',
    },
  },
  {
    tableName: 'notification_preferences',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['user_id'] }],
  }
);

export default NotificationPreference;
