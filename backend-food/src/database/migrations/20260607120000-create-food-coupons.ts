import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("food_coupons", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: false },
      discountType: {
        type: DataTypes.ENUM("percent", "fixed"),
        allowNull: false,
        defaultValue: "percent",
      },
      discountValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      minOrderValue: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
      usageLimit: { type: DataTypes.INTEGER, allowNull: true },
      usageCount: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("food_coupons", ["companyId", "code"], { unique: true });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("food_coupons");
  },
};
