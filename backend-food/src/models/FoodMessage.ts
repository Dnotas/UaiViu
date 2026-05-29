import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import FoodConversation from "./FoodConversation";

@Table({ tableName: "food_messages" })
class FoodMessage extends Model<FoodMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FoodConversation)
  @Column
  conversationId: number;

  @BelongsTo(() => FoodConversation)
  conversation: FoodConversation;

  @Column({ defaultValue: false })
  fromMe: boolean;

  @Column({ type: DataType.TEXT })
  body: string;

  @Column
  timestamp: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodMessage;
