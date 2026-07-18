import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_orders", "customerCity", {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("food_customers", "customerCity", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_orders", "customerCity");
    await queryInterface.removeColumn("food_customers", "customerCity");
  },
};
