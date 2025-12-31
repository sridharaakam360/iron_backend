import { Table, Column, Model, DataType, PrimaryKey, Default, Index, ForeignKey, BelongsTo, HasMany, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';
import { Customer } from './Customer';
import { BillItem } from './BillItem';
import { Notification } from './Notification';

export enum BillStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

@Table({
    tableName: 'bills',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['storeId', 'billNumber'],
        },
    ],
})
export class Bill extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @ForeignKey(() => Store)
    @Index
    @Column(DataType.UUID)
    storeId!: string;

    @BelongsTo(() => Store)
    store!: Store;

    @Index
    @Column(DataType.STRING)
    billNumber!: string;

    @ForeignKey(() => Customer)
    @Index
    @Column(DataType.UUID)
    customerId!: string;

    @BelongsTo(() => Customer)
    customer!: Customer;

    @Column(DataType.DECIMAL(10, 2))
    totalAmount!: number;

    @Index
    @Default(BillStatus.PENDING)
    @Column(DataType.ENUM(...Object.values(BillStatus)))
    status!: BillStatus;

    @Column(DataType.TEXT)
    notes?: string;

    @Index
    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @Column(DataType.DATE)
    completedAt?: Date;

    @HasMany(() => BillItem)
    items!: BillItem[];

    @HasMany(() => Notification)
    notifications!: Notification[];
}
