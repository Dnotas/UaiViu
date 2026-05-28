import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import FoodMenuGroup from "./FoodMenuGroup";

@Table({ tableName: "food_menu_items" })
class FoodMenuItem extends Model<FoodMenuItem> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FoodMenuGroup)
  @Column
  groupId: number;

  @BelongsTo(() => FoodMenuGroup)
  group: FoodMenuGroup;

  @Column
  companyId: number;

  @Column
  name: string;

  @Column({ type: DataType.TEXT })
  description: string;

  @Column({ type: DataType.DECIMAL(10, 2) })
  price: number;

  @Column({ type: DataType.TEXT })
  imageUrl: string;

  @Column({ defaultValue: true })
  active: boolean;

  @Column({ defaultValue: 0 })
  sortOrder: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodMenuItem;
