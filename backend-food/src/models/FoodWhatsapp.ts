import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType
} from "sequelize-typescript";

export type WaStatus = "DISCONNECTED" | "OPENING" | "QRCODE" | "TIMEOUT" | "CONNECTED";

@Table({ tableName: "food_whatsapps" })
class FoodWhatsapp extends Model<FoodWhatsapp> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column({ defaultValue: "Conexão Restaurante" })
  name: string;

  @Column({ type: DataType.ENUM("DISCONNECTED", "OPENING", "QRCODE", "TIMEOUT", "CONNECTED"), defaultValue: "DISCONNECTED" })
  status: WaStatus;

  @Column({ type: DataType.TEXT })
  qrcode: string;

  @Column({ type: DataType.TEXT })
  retryQrSeconds: number;

  @Column({ type: DataType.JSONB })
  session: object;

  @Column
  phone: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodWhatsapp;
