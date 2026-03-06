import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Parse the DATABASE_URL to get connection parameters
function getPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // Default for local development
    return {
      user: 'tadeumarques',
      host: 'localhost',
      database: 'todoapp',
      port: 5432,
    };
  }

  try {
    const url = new URL(databaseUrl);
    return {
      user: url.username || 'tadeumarques',
      password: url.password || undefined,
      host: url.hostname || 'localhost',
      database: url.pathname.slice(1) || 'todoapp',
      port: parseInt(url.port) || 5432,
    };
  } catch {
    // Fallback for local development
    return {
      user: 'tadeumarques',
      host: 'localhost',
      database: 'todoapp',
      port: 5432,
    };
  }
}

// Create a connection pool with explicit parameters
const pool = globalForPrisma.pool ?? new Pool(getPoolConfig());

// Create the Prisma client with the PostgreSQL adapter
const adapter = new PrismaPg(pool);
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
