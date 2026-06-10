import {
  Table, Column, Model, PrimaryKey,
  CreatedAt, UpdatedAt, DataType
} from "sequelize-typescript";

@Table({ tableName: "food_sessions" })
class FoodSession extends Model<FoodSession> {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  token: string;

  @Column
  companyId: number;

  @Column
  jid: string;

  @Column
  whatsappId: number;

  @Column({ allowNull: true })
  phone: string;

  @Column({ type: DataType.DATE })
  expiresAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodSession;
