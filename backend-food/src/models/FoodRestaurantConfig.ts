import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType, Unique
} from "sequelize-typescript";

@Table({ tableName: "food_restaurant_configs" })
class FoodRestaurantConfig extends Model<FoodRestaurantConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  // Referência à empresa do UaiViu principal (tabela Companies)
  @Unique
  @Column
  companyId: number;

  // Slug único para a URL pública do cardápio: /cardapio/:slug
  @Unique
  @Column
  slug: string;

  @Column({ defaultValue: "Olá! 👋 Seja bem-vindo ao nosso restaurante!\nAcesse nosso cardápio:" })
  welcomeMessage: string;

  // Mensagens automáticas por status do pedido
  @Column({ defaultValue: "✅ Pedido recebido! Estamos preparando seu pedido." })
  msgOrderConfirmed: string;

  @Column({ defaultValue: "👨‍🍳 Seu pedido está sendo preparado!" })
  msgOrderPreparing: string;

  @Column({ defaultValue: "🛵 Seu pedido saiu para entrega!" })
  msgOrderOnTheWay: string;

  @Column({ defaultValue: "🎉 Pedido entregue! Obrigado pela preferência." })
  msgOrderDelivered: string;

  // Configurações de entrega
  @Column({ defaultValue: true })
  deliveryEnabled: boolean;

  @Column({ defaultValue: false })
  pickupEnabled: boolean;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  deliveryFee: number;

  @Column({ defaultValue: 30 })
  estimatedDeliveryMinutes: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodRestaurantConfig;
