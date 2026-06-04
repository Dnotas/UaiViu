import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import FoodMenuItem from "./FoodMenuItem";

@Table({ tableName: "food_item_complements" })
class FoodItemComplement extends Model<FoodItemComplement> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FoodMenuItem)
  @Column
  menuItemId: number;

  @BelongsTo(() => FoodMenuItem)
  menuItem: FoodMenuItem;

  @Column({ allowNull: false })
  name: string;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  price: number;

  @Column({ defaultValue: true })
  active: boolean;

  @Column({ defaultValue: 0 })
  sortOrder: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodItemComplement;
