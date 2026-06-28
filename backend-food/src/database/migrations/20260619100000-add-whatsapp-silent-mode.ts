import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_restaurant_configs", "whatsappSilentMode", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addColumn("food_restaurant_configs", "whatsappSilentMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Olá! 😊 Não respondemos mensagens por aqui. Para fazer seu pedido, acesse nosso cardápio pelo link que enviamos.",
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("food_restaurant_configs", "whatsappSilentMode");
    await queryInterface.removeColumn("food_restaurant_configs", "whatsappSilentMessage");
  },
};
