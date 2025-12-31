import { Table, Column, Model, DataType, PrimaryKey, Default, Index, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { Bill } from './Bill';

export enum NotificationType {
    SMS = 'SMS',
    EMAIL = 'EMAIL',
    WHATSAPP = 'WHATSAPP',
}

export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
}

@Table({
    tableName: 'notifications',
    timestamps: true,
    updatedAt: false,
})
export class Notification extends Model {
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

    @Column(DataType.ENUM(...Object.values(NotificationType)))
    type!: NotificationType;

    @Index
    @Default(NotificationStatus.PENDING)
    @Column(DataType.ENUM(...Object.values(NotificationStatus)))
    status!: NotificationStatus;

    @Column(DataType.STRING)
    recipient!: string;

    @Column(DataType.TEXT)
    message!: string;

    @Column(DataType.DATE)
    sentAt?: Date;

    @Column(DataType.TEXT)
    error?: string;

    @CreatedAt
    createdAt!: Date;
}
