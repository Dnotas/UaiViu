import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_orders", "couponCode", {
      type: DataTypes.STRING, allowNull: true,
    });
    await queryInterface.addColumn("food_orders", "discountAmount", {
      type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_orders", "couponCode");
    await queryInterface.removeColumn("food_orders", "discountAmount");
  },
};
