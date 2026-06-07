import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Quantidade de adicionais gratuitos por item (null = todos pagos)
    await queryInterface.addColumn("food_menu_items", "freeComplementsLimit", {
      type: DataTypes.INTEGER, allowNull: true, defaultValue: null,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_menu_items", "freeComplementsLimit");
  },
};
