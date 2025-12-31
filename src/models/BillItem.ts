import { Table, Column, Model, DataType, PrimaryKey, Default, Index, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { Bill } from './Bill';
import { Category } from './Category';

@Table({
    tableName: 'bill_items',
    timestamps: true,
    updatedAt: false,
})
export class BillItem extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @ForeignKey(() => Bill)
    @Index
    @Column(DataType.UUID)
    billId!: string;

    @BelongsTo(() => Bill)
    bill!: Bill;

    @ForeignKey(() => Category)
    @Index
    @Column(DataType.UUID)
    categoryId!: string;

    @BelongsTo(() => Category)
    category!: Category;

    @Column(DataType.INTEGER)
    quantity!: number;

    @Column(DataType.DECIMAL(10, 2))
    price!: number;

    @Column(DataType.DECIMAL(10, 2))
    subtotal!: number;

    @CreatedAt
    createdAt!: Date;
}
