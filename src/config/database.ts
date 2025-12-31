import { PrismaClient } from '../generated/prisma';
import { env } from './env';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prismaClientSingleton = () => {
  // Parse DATABASE_URL to extract connection details
  // Format: mysql://user:password@host:port/database
  const url = new URL(env.DATABASE_URL);

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading '/'
    port: parseInt(url.port) || 3306,
    connectionLimit: 10,
    connectTimeout: 10000, // 10 seconds
    acquireTimeout: 10000, // 10 seconds
  });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};

process.on('beforeExit', async () => {
  await disconnectDatabase();
});
