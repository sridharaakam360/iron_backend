import { Table, Column, Model, DataType, PrimaryKey, Default, Unique, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    EMPLOYEE = 'EMPLOYEE',
}

@Table({
    tableName: 'users',
    timestamps: true,
})
export class User extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @Unique
    @Column(DataType.STRING)
    email!: string;

    @Column(DataType.STRING)
    password!: string;

    @Column(DataType.STRING)
    name!: string;

    @Default(UserRole.ADMIN)
    @Column(DataType.ENUM(...Object.values(UserRole)))
    role!: UserRole;

    @ForeignKey(() => Store)
    @Column(DataType.UUID)
    storeId?: string;

    @BelongsTo(() => Store)
    store?: Store;

    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive!: boolean;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;
}
