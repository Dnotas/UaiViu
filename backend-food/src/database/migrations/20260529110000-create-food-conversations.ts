import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("food_conversations", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      whatsappId: { type: DataTypes.INTEGER, allowNull: false },
      customerJid: { type: DataTypes.STRING, allowNull: false },
      customerPhone: { type: DataTypes.STRING, allowNull: true },
      customerName: { type: DataTypes.STRING, allowNull: true },
      lastMessage: { type: DataTypes.TEXT, allowNull: true },
      lastMessageAt: { type: DataTypes.DATE, allowNull: true },
      unreadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex("food_conversations", ["companyId", "customerJid"], { unique: true });

    await queryInterface.createTable("food_messages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "food_conversations", key: "id" },
        onDelete: "CASCADE",
      },
      fromMe: { type: DataTypes.BOOLEAN, defaultValue: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      timestamp: { type: DataTypes.DATE, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("food_messages");
    await queryInterface.dropTable("food_conversations");
  },
};
