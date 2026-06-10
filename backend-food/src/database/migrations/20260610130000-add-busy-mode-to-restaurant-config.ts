import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_restaurant_configs", "busyMode", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "busyMode");
  },
};
