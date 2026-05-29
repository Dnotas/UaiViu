import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType, HasMany
} from "sequelize-typescript";
import FoodMessage from "./FoodMessage";

@Table({ tableName: "food_conversations" })
class FoodConversation extends Model<FoodConversation> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column
  whatsappId: number;

  @Column
  customerJid: string;

  @Column({ allowNull: true })
  customerPhone: string;

  @Column({ allowNull: true })
  customerName: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  lastMessage: string;

  @Column({ allowNull: true })
  lastMessageAt: Date;

  @Column({ defaultValue: 0 })
  unreadCount: number;

  @HasMany(() => FoodMessage, { onDelete: "CASCADE", hooks: true })
  messages: FoodMessage[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodConversation;
