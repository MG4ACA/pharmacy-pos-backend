'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create notification_preferences table
    await queryInterface.createTable('notification_preferences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true,
      },
      // Low Stock Alerts
      low_stock_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      low_stock_threshold: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },
      low_stock_frequency: {
        type: Sequelize.ENUM('realtime', 'daily', 'weekly'),
        defaultValue: 'realtime',
      },
      // Expiring Products Alerts
      expiring_products_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      expiring_products_days: {
        type: Sequelize.INTEGER,
        defaultValue: 30,
      },
      expiring_products_frequency: {
        type: Sequelize.ENUM('realtime', 'daily', 'weekly'),
        defaultValue: 'daily',
      },
      // Daily Sales Summary
      daily_sales_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      daily_sales_time: {
        type: Sequelize.TIME,
        defaultValue: '23:00:00',
      },
      // System Updates
      system_updates_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      system_updates_frequency: {
        type: Sequelize.ENUM('realtime', 'daily', 'weekly'),
        defaultValue: 'realtime',
      },
      // Payment Reminders
      payment_reminders_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      payment_reminders_frequency: {
        type: Sequelize.ENUM('realtime', 'daily', 'weekly'),
        defaultValue: 'daily',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Create notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'low_stock',
          'expiring_product',
          'daily_sales',
          'system_update',
          'payment_reminder'
        ),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('notification_preferences', ['user_id']);
    await queryInterface.addIndex('notifications', ['user_id']);
    await queryInterface.addIndex('notifications', ['type']);
    await queryInterface.addIndex('notifications', ['is_read']);
    await queryInterface.addIndex('notifications', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('notification_preferences');
  },
};
