import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

let testPrisma: PrismaClient | undefined;

// Get test database client
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const adapter = new PrismaLibSql({
      url: process.env.TEST_DATABASE_URL || 'file:./test.db',
    });
    testPrisma = new PrismaClient({ adapter });
  }
  return testPrisma;
}

// Clean up all data from test database
export async function cleanupTestDatabase() {
  const prisma = getTestPrisma();
  await prisma.todo.deleteMany({});
}

// Disconnect from test database
export async function disconnectTestDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = undefined;
  }
}
