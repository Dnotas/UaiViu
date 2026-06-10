import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("food_orders", "idempotencyKey", {
      type: DataTypes.UUID,
      allowNull: true,
    });
    await queryInterface.addIndex("food_orders", ["companyId", "idempotencyKey"], {
      unique: true,
      where: { idempotencyKey: { [Symbol.for("ne")]: null } } as any,
      name: "food_orders_company_idempotency_key",
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("food_orders", "food_orders_company_idempotency_key");
    await queryInterface.removeColumn("food_orders", "idempotencyKey");
  },
};
