import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Add hasComplements column to food_menu_items
    await queryInterface.addColumn("food_menu_items", "hasComplements", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    // Create food_item_complements table
    await queryInterface.createTable("food_item_complements", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      menuItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "food_menu_items", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: DataTypes.STRING, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("food_item_complements");
    await queryInterface.removeColumn("food_menu_items", "hasComplements");
  },
};
