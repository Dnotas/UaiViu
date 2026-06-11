import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_restaurant_configs", "storeStatus", {
      type: DataTypes.ENUM("open", "closed_silent", "closed_notice"),
      defaultValue: "open",
      allowNull: false,
    });
    await queryInterface.addColumn("food_restaurant_configs", "closedMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Olá! No momento estamos fechados. Em breve voltamos. 😊",
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "storeStatus");
    await queryInterface.removeColumn("food_restaurant_configs", "closedMessage");
  },
};
