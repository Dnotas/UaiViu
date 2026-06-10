import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType, HasMany
} from "sequelize-typescript";
import FoodOrderItem from "./FoodOrderItem";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "on_the_way" | "delivered" | "cancelled";
export type PaymentMethod = "credit" | "debit" | "pix" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed";

@Table({ tableName: "food_orders" })
class FoodOrder extends Model<FoodOrder> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  // Dados do cliente final
  @Column
  customerName: string;

  @Column
  customerPhone: string;

  @Column({ type: DataType.TEXT })
  customerAddress: string;

  @Column
  customerAddressNumber: string;

  @Column
  customerAddressComplement: string;

  @Column
  customerNeighborhood: string;

  // Valores
  @Column({ type: DataType.DECIMAL(10, 2) })
  subtotal: number;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  deliveryFee: number;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0, allowNull: true })
  discountAmount: number;

  @Column({ type: DataType.STRING, allowNull: true })
  couponCode: string;

  @Column({ type: DataType.DECIMAL(10, 2) })
  total: number;

  // Status do pedido
  @Column({
    type: DataType.ENUM("pending", "confirmed", "preparing", "on_the_way", "delivered", "cancelled"),
    defaultValue: "pending"
  })
  status: OrderStatus;

  // Pagamento
  @Column({ type: DataType.ENUM("credit", "debit", "pix", "cash") })
  paymentMethod: PaymentMethod;

  @Column({
    type: DataType.ENUM("pending", "paid", "failed"),
    defaultValue: "pending"
  })
  paymentStatus: PaymentStatus;

  // Token único para o link do motoboy confirmar entrega
  @Column({ type: DataType.UUID })
  deliveryToken: string;

  // JID do WhatsApp do cliente (pode ser LID) para envio de mensagens
  @Column({ allowNull: true })
  customerJid: string;

  @Column({ allowNull: true })
  whatsappId: number;

  // Tipo: delivery ou retirada
  @Column({ type: DataType.ENUM("delivery", "pickup"), defaultValue: "delivery" })
  orderType: "delivery" | "pickup";

  @Column({ type: DataType.TEXT })
  notes: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  cancelReason: string;

  // Token de idempotência para evitar pedidos duplicados (duplo clique)
  @Column({ type: DataType.UUID, allowNull: true })
  idempotencyKey: string;

  @HasMany(() => FoodOrderItem, { onDelete: "CASCADE", hooks: true })
  items: FoodOrderItem[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodOrder;
