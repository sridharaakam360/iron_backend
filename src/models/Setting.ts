import { Table, Column, Model, DataType, PrimaryKey, Default, Unique, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
    tableName: 'settings',
    timestamps: true,
})
export class Setting extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @Unique
    @Column(DataType.STRING)
    key!: string;

    @Column(DataType.TEXT)
    value!: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;
}
