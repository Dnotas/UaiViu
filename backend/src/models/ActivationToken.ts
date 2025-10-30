import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Plan from "./Plan";
import User from "./User";

@Table
class ActivationToken extends Model<ActivationToken> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  token: string;

  @Column
  companyName: string;

  @ForeignKey(() => Plan)
  @Column
  planId: number;

  @BelongsTo(() => Plan)
  plan: Plan;

  @Column
  maxUsers: number;

  @Column
  maxConnections: number;

  @Column
  expiresAt: Date;

  @Column
  usedAt: Date;

  @Column(DataType.ENUM("available", "used", "expired"))
  status: string;

  @ForeignKey(() => User)
  @Column
  createdBy: number;

  @BelongsTo(() => User)
  creator: User;

  @Column(DataType.TEXT)
  notes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ActivationToken;
