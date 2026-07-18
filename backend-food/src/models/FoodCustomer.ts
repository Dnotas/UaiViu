import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  CreatedAt, UpdatedAt, DataType, Unique, Index
} from "sequelize-typescript";

@Table({ tableName: "food_customers" })
class FoodCustomer extends Model<FoodCustomer> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ allowNull: false })
  companyId: number;

  @Column({ allowNull: false })
  phone: string;

  @Column({ allowNull: true })
  customerName: string;

  @Column({ allowNull: true })
  cep: string;

  @Column({ allowNull: true })
  customerAddress: string;

  @Column({ allowNull: true })
  customerAddressNumber: string;

  @Column({ allowNull: true })
  customerAddressComplement: string;

  @Column({ allowNull: true })
  customerNeighborhood: string;

  @Column({ allowNull: true })
  customerCity: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FoodCustomer;
