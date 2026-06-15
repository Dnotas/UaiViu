import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_restaurant_configs", "msgOrderReadyForPickup", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "✅ Seu pedido está pronto! Pode vir retirar quando quiser.",
    });
    await queryInterface.addColumn("food_restaurant_configs", "businessHours", {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "msgOrderReadyForPickup");
    await queryInterface.removeColumn("food_restaurant_configs", "businessHours");
  },
};
