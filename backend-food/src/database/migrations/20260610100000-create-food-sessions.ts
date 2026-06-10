import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("food_sessions", {
      token: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      jid: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("food_sessions", ["expiresAt"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("food_sessions");
  },
};
