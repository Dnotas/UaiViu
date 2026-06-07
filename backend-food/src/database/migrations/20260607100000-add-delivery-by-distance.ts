import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Taxa de entrega por distância no restaurante
    await queryInterface.addColumn("food_restaurant_configs", "restaurantAddress", {
      type: DataTypes.TEXT, allowNull: true,
    });
    await queryInterface.addColumn("food_restaurant_configs", "restaurantLat", {
      type: DataTypes.DECIMAL(10, 7), allowNull: true,
    });
    await queryInterface.addColumn("food_restaurant_configs", "restaurantLng", {
      type: DataTypes.DECIMAL(10, 7), allowNull: true,
    });
    await queryInterface.addColumn("food_restaurant_configs", "deliveryByDistance", {
      type: DataTypes.BOOLEAN, defaultValue: false,
    });
    // JSON: [{ maxKm: number, fee: number, prepMinutes: number }]
    await queryInterface.addColumn("food_restaurant_configs", "deliveryRates", {
      type: DataTypes.JSONB, allowNull: true,
    });

    // Disponibilidade temporária de itens do cardápio
    await queryInterface.addColumn("food_menu_items", "available", {
      type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "restaurantAddress");
    await queryInterface.removeColumn("food_restaurant_configs", "restaurantLat");
    await queryInterface.removeColumn("food_restaurant_configs", "restaurantLng");
    await queryInterface.removeColumn("food_restaurant_configs", "deliveryByDistance");
    await queryInterface.removeColumn("food_restaurant_configs", "deliveryRates");
    await queryInterface.removeColumn("food_menu_items", "available");
  },
};
