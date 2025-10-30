import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("ActivationTokens", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      planId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      maxUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      maxConnections: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("available", "used", "expired"),
        allowNull: false,
        defaultValue: "available"
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("ActivationTokens");
  }
};
