import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Notification = sequelize.define(
  'Notification',
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
    },
    type: {
      type: DataTypes.ENUM(
        'low_stock',
        'expiring_product',
        'daily_sales',
        'system_update',
        'payment_reminder'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional data (product_id, sale_id, etc.)',
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
    },
  },
  {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['type'] },
      { fields: ['is_read'] },
      { fields: ['created_at'] },
    ],
  }
);

// Instance Methods
Notification.prototype.markAsRead = async function () {
  this.is_read = true;
  this.read_at = new Date();
  await this.save();
};

export default Notification;
