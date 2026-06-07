import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, ForeignKey, BelongsTo, HasMany, DataType
} from "sequelize-typescript";
import FoodMenuGroup from "./FoodMenuGroup";
import FoodItemComplement from "./FoodItemComplement";

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

  // false = indisponível no momento (visível no cardápio mas bloqueado para pedidos)
  @Column({ defaultValue: true })
  available: boolean;

  // Quantidade de adicionais gratuitos (null = todos pagos, 0 = nenhum grátis, N = primeiros N grátis)
  @Column({ type: DataType.INTEGER, allowNull: true })
  freeComplementsLimit: number | null;

  @Column({ defaultValue: 0 })
  sortOrder: number;

  @Column({ defaultValue: false })
  hasComplements: boolean;

  @HasMany(() => FoodItemComplement, { onDelete: "CASCADE", hooks: true })
  complements: FoodItemComplement[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodMenuItem;
