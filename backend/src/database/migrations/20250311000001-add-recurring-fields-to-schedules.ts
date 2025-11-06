import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Schedules", "isRecurring", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      queryInterface.addColumn("Schedules", "recurringType", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
        comment: "Tipo de recorrência: daily, weekly, monthly"
      }),
      queryInterface.addColumn("Schedules", "recurringTime", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
        comment: "Hora do dia para enviar (formato HH:mm)"
      }),
      queryInterface.addColumn("Schedules", "lastRunAt", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }),
      queryInterface.addColumn("Schedules", "isActive", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Schedules", "isRecurring"),
      queryInterface.removeColumn("Schedules", "recurringType"),
      queryInterface.removeColumn("Schedules", "recurringTime"),
      queryInterface.removeColumn("Schedules", "lastRunAt"),
      queryInterface.removeColumn("Schedules", "isActive")
    ]);
  }
};
