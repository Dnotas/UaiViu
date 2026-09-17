import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Whatsapps", "wapiInstanceId", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("Whatsapps", "wapiInstanceToken", {
        type: DataTypes.STRING,
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Whatsapps", "wapiInstanceId"),
      queryInterface.removeColumn("Whatsapps", "wapiInstanceToken")
    ]);
  }
};
