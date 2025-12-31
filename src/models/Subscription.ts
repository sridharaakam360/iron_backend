import { Table, Column, Model, DataType, PrimaryKey, Default, Index, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { Store } from './Store';

export enum SubscriptionPlan {
    FREE = 'FREE',
    PRO = 'PRO',
}

export enum SubscriptionStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    SUSPENDED = 'SUSPENDED',
}

export enum BillingCycle {
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY',
    CUSTOM = 'CUSTOM',
}

@Table({
    tableName: 'subscriptions',
    timestamps: true,
})
export class Subscription extends Model {
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

    @Default(SubscriptionPlan.FREE)
    @Column(DataType.ENUM(...Object.values(SubscriptionPlan)))
    plan!: SubscriptionPlan;

    @Index
    @Default(SubscriptionStatus.ACTIVE)
    @Column(DataType.ENUM(...Object.values(SubscriptionStatus)))
    status!: SubscriptionStatus;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    startDate!: Date;

    @Column(DataType.DATE)
    endDate!: Date;

    @Index
    @Column(DataType.DATE)
    renewalDate!: Date;

    @Column(DataType.DECIMAL(10, 2))
    amount!: number;

    @Default(BillingCycle.MONTHLY)
    @Column(DataType.ENUM(...Object.values(BillingCycle)))
    billingCycle!: BillingCycle;

    @Default(true)
    @Column(DataType.BOOLEAN)
    autoRenew!: boolean;

    @Column(DataType.DATE)
    cancelledAt?: Date;

    @Column(DataType.TEXT)
    cancelReason?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;
}
