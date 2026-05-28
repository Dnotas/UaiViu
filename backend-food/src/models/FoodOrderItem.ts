import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import FoodOrder from "./FoodOrder";

@Table({ tableName: "food_order_items" })
class FoodOrderItem extends Model<FoodOrderItem> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FoodOrder)
  @Column
  orderId: number;

  @BelongsTo(() => FoodOrder)
  order: FoodOrder;

  @Column
  menuItemId: number;

  @Column
  name: string;

  @Column({ type: DataType.DECIMAL(10, 2) })
  unitPrice: number;

  @Column({ defaultValue: 1 })
  quantity: number;

  @Column({ type: DataType.DECIMAL(10, 2) })
  total: number;

  @Column({ type: DataType.TEXT })
  notes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodOrderItem;
