import { Table, Column, Model, DataType, HasMany, PrimaryKey, Default, Unique, Index, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { User } from './User';
import { Customer } from './Customer';
import { Category } from './Category';
import { Bill } from './Bill';
import { ServiceType } from './ServiceType';
import { StoreSetting } from './StoreSetting';
import { Subscription } from './Subscription';

@Table({
    tableName: 'stores',
    timestamps: true,
})
export class Store extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @Column(DataType.STRING)
    name!: string;

    @Unique
    @Index
    @Column(DataType.STRING)
    email!: string;

    @Column(DataType.STRING)
    phone!: string;

    @Column(DataType.TEXT)
    address?: string;

    @Column(DataType.STRING)
    city?: string;

    @Column(DataType.STRING)
    state?: string;

    @Column(DataType.STRING)
    pincode?: string;

    @Column(DataType.STRING)
    gstNumber?: string;

    @Column(DataType.STRING)
    logoUrl?: string;

    @Index
    @Default(false)
    @Column(DataType.BOOLEAN)
    isApproved!: boolean;

    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive!: boolean;

    @Column(DataType.TEXT)
    deactivationReason?: string;

    @Column(DataType.DATE)
    deactivatedAt?: Date;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @HasMany(() => User)
    users!: User[];

    @HasMany(() => Customer)
    customers!: Customer[];

    @HasMany(() => Bill)
    bills!: Bill[];

    @HasMany(() => Category)
    categories!: Category[];

    @HasMany(() => ServiceType)
    serviceTypes!: ServiceType[];

    @HasMany(() => StoreSetting)
    settings!: StoreSetting[];

    @HasMany(() => Subscription)
    subscriptions!: Subscription[];
}
