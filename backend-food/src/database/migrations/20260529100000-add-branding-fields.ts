import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_restaurant_configs", "restaurantName", {
      type: DataTypes.STRING, allowNull: true,
    });
    await queryInterface.addColumn("food_restaurant_configs", "primaryColor", {
      type: DataTypes.STRING(7), allowNull: true, defaultValue: "#FF5722",
    });
    await queryInterface.addColumn("food_restaurant_configs", "logoUrl", {
      type: DataTypes.STRING, allowNull: true,
    });
    await queryInterface.addColumn("food_restaurant_configs", "bannerImageUrl", {
      type: DataTypes.STRING, allowNull: true,
    });
    await queryInterface.addColumn("food_menu_groups", "imageUrl", {
      type: DataTypes.STRING, allowNull: true,
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "restaurantName");
    await queryInterface.removeColumn("food_restaurant_configs", "primaryColor");
    await queryInterface.removeColumn("food_restaurant_configs", "logoUrl");
    await queryInterface.removeColumn("food_restaurant_configs", "bannerImageUrl");
    await queryInterface.removeColumn("food_menu_groups", "imageUrl");
  },
};
