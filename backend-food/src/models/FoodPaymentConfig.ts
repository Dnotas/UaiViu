import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType, Unique
} from "sequelize-typescript";

@Table({ tableName: "food_payment_configs" })
class FoodPaymentConfig extends Model<FoodPaymentConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Unique
  @Column
  companyId: number;

  // Pagar na entrega — sempre disponível por padrão
  @Column({ defaultValue: true })
  cashEnabled: boolean;

  // PIX
  @Column({ defaultValue: false })
  pixEnabled: boolean;

  @Column
  pixKey: string;

  @Column({ type: DataType.ENUM("cpf", "cnpj", "email", "phone", "random"), defaultValue: "random" })
  pixKeyType: string;

  @Column
  pixReceiverName: string;

  // Cartão (Mercado Pago)
  @Column({ defaultValue: false })
  cardEnabled: boolean;

  // "mercadopago" | "pagseguro" | "stripe"
  @Column({ defaultValue: "mercadopago" })
  cardProvider: string;

  @Column({ type: DataType.TEXT })
  cardPublicKey: string;

  @Column({ type: DataType.TEXT })
  cardAccessToken: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodPaymentConfig;
