import { Sequelize } from 'sequelize-typescript';
import { env } from './env';
import * as models from '../models';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: env.DB_HOST,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  port: env.DB_PORT,
  models: Object.values(models).filter(m => typeof m === 'function'),
  logging: env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: false, // Prisma used camelCase for field names by default
  }
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully (Sequelize)');

    // In development/test, we might want to sync. 
    // In production, use migrations.
    if (env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synced');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await sequelize.close();
  console.log('Database disconnected');
};

process.on('beforeExit', async () => {
  await disconnectDatabase();
});

