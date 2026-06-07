import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType
} from "sequelize-typescript";

@Table({ tableName: "food_coupons" })
class FoodCoupon extends Model<FoodCoupon> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column
  code: string;

  @Column({ type: DataType.ENUM("percent", "fixed") })
  discountType: "percent" | "fixed";

  @Column({ type: DataType.DECIMAL(10, 2) })
  discountValue: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  minOrderValue: number | null;

  @Column({ defaultValue: true })
  active: boolean;

  @Column({ type: DataType.INTEGER, allowNull: true })
  usageLimit: number | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  usageCount: number;

  @Column({ type: DataType.DATE, allowNull: true })
  expiresAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodCoupon;
