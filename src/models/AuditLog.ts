import { Table, Column, Model, DataType, PrimaryKey, Default, Index, CreatedAt } from 'sequelize-typescript';

@Table({
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
})
export class AuditLog extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id!: string;

    @Index
    @Column(DataType.UUID)
    userId?: string;

    @Column(DataType.STRING)
    action!: string;

    @Index
    @Column(DataType.STRING)
    entity!: string;

    @Column(DataType.STRING)
    entityId?: string;

    @Column(DataType.TEXT)
    changes?: string;

    @Column(DataType.STRING)
    ipAddress?: string;

    @Column(DataType.TEXT)
    userAgent?: string;

    @Index
    @CreatedAt
    createdAt!: Date;
}
