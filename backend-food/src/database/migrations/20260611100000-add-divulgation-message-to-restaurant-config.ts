import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_restaurant_configs", "divulgationMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "divulgationMessage");
  },
};
