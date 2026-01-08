import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo, HasMany, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';
import { Category } from './Category';

@Table({
    tableName: 'service_types',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['storeId', 'name'],
        },
    ],
})
export class ServiceType extends Model {
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

    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive!: boolean;

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;

    @HasMany(() => Category)
    categories!: Category[];
}
