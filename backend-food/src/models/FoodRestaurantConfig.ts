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

  @Column({ defaultValue: "✅ Seu pedido está pronto! Pode vir retirar quando quiser." })
  msgOrderReadyForPickup: string;

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

  // Endereço e taxa por distância
  @Column({ type: DataType.TEXT, allowNull: true })
  restaurantAddress: string;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
  restaurantLat: number;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
  restaurantLng: number;

  @Column({ defaultValue: false })
  deliveryByDistance: boolean;

  // [{ maxKm: number, fee: number, prepMinutes: number }] ordenado por maxKm asc
  @Column({ type: DataType.JSONB, allowNull: true })
  deliveryRates: Array<{ maxKm: number; fee: number; prepMinutes: number }>;

  // Taxas fixas por cidade/bairro, checadas ANTES da tabela por distância.
  // [{ city: string, neighborhood: string|null (vazio = qualquer bairro da cidade), fee: number, prepMinutes: number|null }]
  @Column({ type: DataType.JSONB, allowNull: true })
  deliveryRatesByLocation: Array<{ city: string; neighborhood: string | null; fee: number; prepMinutes: number | null }>;

  // Modo ocupado: exibe aviso no cardápio e pode bloquear novos pedidos
  @Column({ defaultValue: false })
  busyMode: boolean;

  // Status da loja: open | closed_silent | closed_notice
  @Column({
    type: DataType.ENUM("open", "closed_silent", "closed_notice"),
    defaultValue: "open",
  })
  storeStatus: "open" | "closed_silent" | "closed_notice";

  // Mensagem enviada ao cliente quando storeStatus = closed_notice
  @Column({ type: DataType.TEXT, allowNull: true })
  closedMessage: string;

  // Personalização visual
  @Column({ allowNull: true })
  restaurantName: string;

  @Column({ type: DataType.STRING(7), allowNull: true, defaultValue: "#FF5722" })
  primaryColor: string;

  @Column({ allowNull: true })
  logoUrl: string;

  @Column({ allowNull: true })
  bannerImageUrl: string;

  // Mensagem de divulgação: quando o cliente envia essa palavra-chave pelo link wa.me,
  // o bot responde automaticamente com o link do cardápio
  @Column({ type: DataType.TEXT, allowNull: true })
  divulgationMessage: string;

  // Horário de funcionamento: [{dayOfWeek:0-6, enabled:bool, open:"HH:mm", close:"HH:mm"}]
  @Column({ type: DataType.JSONB, allowNull: true })
  businessHours: Array<{ dayOfWeek: number; enabled: boolean; open: string; close: string }>;

  // Modo silencioso: após enviar o link do cardápio, responde com mensagem configurada
  // quando o cliente manda qualquer outra mensagem (não bloqueia msgs automáticas de pedido)
  @Column({ defaultValue: false })
  whatsappSilentMode: boolean;

  @Column({ type: DataType.TEXT, allowNull: true, defaultValue: "Olá! 😊 Não respondemos mensagens por aqui. Para fazer seu pedido, acesse nosso cardápio pelo link que enviamos." })
  whatsappSilentMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodRestaurantConfig;
