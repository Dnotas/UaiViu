import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_orders", "customerJid", {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("food_orders", "whatsappId", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_orders", "customerJid");
    await queryInterface.removeColumn("food_orders", "whatsappId");
  },
};
