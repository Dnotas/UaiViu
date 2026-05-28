import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // food_restaurant_configs
    await queryInterface.createTable("food_restaurant_configs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      welcomeMessage: { type: DataTypes.TEXT, defaultValue: "Olá! 👋 Seja bem-vindo!\nAcesse nosso cardápio:" },
      msgOrderConfirmed: { type: DataTypes.TEXT, defaultValue: "✅ Pedido recebido! Estamos preparando seu pedido." },
      msgOrderPreparing: { type: DataTypes.TEXT, defaultValue: "👨‍🍳 Seu pedido está sendo preparado!" },
      msgOrderOnTheWay: { type: DataTypes.TEXT, defaultValue: "🛵 Seu pedido saiu para entrega!" },
      msgOrderDelivered: { type: DataTypes.TEXT, defaultValue: "🎉 Pedido entregue! Obrigado pela preferência." },
      deliveryEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
      pickupEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      deliveryFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      estimatedDeliveryMinutes: { type: DataTypes.INTEGER, defaultValue: 30 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // food_whatsapps
    await queryInterface.createTable("food_whatsapps", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, defaultValue: "Conexão Restaurante" },
      status: { type: DataTypes.STRING(20), defaultValue: "DISCONNECTED" },
      qrcode: { type: DataTypes.TEXT },
      retryQrSeconds: { type: DataTypes.INTEGER },
      session: { type: DataTypes.JSONB },
      phone: { type: DataTypes.STRING },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // food_menu_groups
    await queryInterface.createTable("food_menu_groups", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // food_menu_items
    await queryInterface.createTable("food_menu_items", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "food_menu_groups", key: "id" }, onDelete: "CASCADE" },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      imageUrl: { type: DataTypes.TEXT },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // food_orders
    await queryInterface.createTable("food_orders", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      customerName: { type: DataTypes.STRING },
      customerPhone: { type: DataTypes.STRING },
      customerAddress: { type: DataTypes.TEXT },
      customerAddressNumber: { type: DataTypes.STRING },
      customerAddressComplement: { type: DataTypes.STRING },
      customerNeighborhood: { type: DataTypes.STRING },
      subtotal: { type: DataTypes.DECIMAL(10, 2) },
      deliveryFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(10, 2) },
      status: { type: DataTypes.STRING(20), defaultValue: "pending" },
      paymentMethod: { type: DataTypes.STRING(20) },
      paymentStatus: { type: DataTypes.STRING(20), defaultValue: "pending" },
      deliveryToken: { type: DataTypes.UUID },
      orderType: { type: DataTypes.STRING(20), defaultValue: "delivery" },
      notes: { type: DataTypes.TEXT },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // food_order_items
    await queryInterface.createTable("food_order_items", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "food_orders", key: "id" }, onDelete: "CASCADE" },
      menuItemId: { type: DataTypes.INTEGER },
      name: { type: DataTypes.STRING, allowNull: false },
      unitPrice: { type: DataTypes.DECIMAL(10, 2) },
      quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
      total: { type: DataTypes.DECIMAL(10, 2) },
      notes: { type: DataTypes.TEXT },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // food_payment_configs
    await queryInterface.createTable("food_payment_configs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      cashEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
      pixEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      pixKey: { type: DataTypes.STRING },
      pixKeyType: { type: DataTypes.STRING(20), defaultValue: "random" },
      pixReceiverName: { type: DataTypes.STRING },
      cardEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      cardProvider: { type: DataTypes.STRING, defaultValue: "mercadopago" },
      cardPublicKey: { type: DataTypes.TEXT },
      cardAccessToken: { type: DataTypes.TEXT },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("food_order_items");
    await queryInterface.dropTable("food_orders");
    await queryInterface.dropTable("food_menu_items");
    await queryInterface.dropTable("food_menu_groups");
    await queryInterface.dropTable("food_payment_configs");
    await queryInterface.dropTable("food_whatsapps");
    await queryInterface.dropTable("food_restaurant_configs");
  }
};
