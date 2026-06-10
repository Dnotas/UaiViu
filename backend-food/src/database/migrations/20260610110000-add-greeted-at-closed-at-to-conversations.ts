import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_conversations", "greetedAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("food_conversations", "closedAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_conversations", "greetedAt");
    await queryInterface.removeColumn("food_conversations", "closedAt");
  },
};
