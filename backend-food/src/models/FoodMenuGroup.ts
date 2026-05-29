import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, HasMany
} from "sequelize-typescript";
import FoodMenuItem from "./FoodMenuItem";

@Table({ tableName: "food_menu_groups" })
class FoodMenuGroup extends Model<FoodMenuGroup> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column
  name: string;

  @Column({ defaultValue: 0 })
  sortOrder: number;

  @Column({ defaultValue: true })
  active: boolean;

  @Column({ allowNull: true })
  imageUrl: string;

  @HasMany(() => FoodMenuItem, { onDelete: "CASCADE", hooks: true })
  items: FoodMenuItem[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodMenuGroup;
