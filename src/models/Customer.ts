import { Table, Column, Model, DataType, PrimaryKey, Default, Index, ForeignKey, BelongsTo, HasMany, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';
import { Bill } from './Bill';

@Table({
    tableName: 'customers',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['storeId', 'phone'],
        },
    ],
})
export class Customer extends Model {
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
    name!: string;

    @Index
    @Column(DataType.STRING)
    phone!: string;

    @Column(DataType.STRING)
    email?: string;

    @Column(DataType.TEXT)
    address?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @HasMany(() => Bill)
    bills!: Bill[];
}
