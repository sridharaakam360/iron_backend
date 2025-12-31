import { Table, Column, Model, DataType, PrimaryKey, Default, Index, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';

@Table({
    tableName: 'store_settings',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['storeId', 'key'],
        },
    ],
})
export class StoreSetting extends Model {
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

    @Column(DataType.STRING)
    key!: string;

    @Column(DataType.TEXT)
    value!: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;
}
