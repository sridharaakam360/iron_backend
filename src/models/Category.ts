import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo, HasMany, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';
import { BillItem } from './BillItem';

@Table({
    tableName: 'categories',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['storeId', 'name'],
        },
    ],
})
export class Category extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @ForeignKey(() => Store)
    @Column(DataType.UUID)
    storeId!: string;

    @BelongsTo(() => Store)
    store!: Store;

    @Column(DataType.STRING)
    name!: string;

    @Column(DataType.DECIMAL(10, 2))
    price!: number;

    @Column(DataType.STRING)
    icon?: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive!: boolean;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @HasMany(() => BillItem)
    billItems!: BillItem[];
}
