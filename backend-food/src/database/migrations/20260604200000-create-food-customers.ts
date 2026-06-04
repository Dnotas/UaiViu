import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("food_customers", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      customerName: { type: DataTypes.STRING },
      cep: { type: DataTypes.STRING(10) },
      customerAddress: { type: DataTypes.STRING },
      customerAddressNumber: { type: DataTypes.STRING(20) },
      customerAddressComplement: { type: DataTypes.STRING },
      customerNeighborhood: { type: DataTypes.STRING },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex("food_customers", ["companyId", "phone"], { unique: true });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("food_customers");
  },
};
