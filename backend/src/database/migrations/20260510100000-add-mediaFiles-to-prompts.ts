import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Prompts", "mediaFiles", {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Prompts", "mediaFiles");
  }
};
