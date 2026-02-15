import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Set the test database URL
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/zen_hordes_test';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create adapter
const adapter = new PrismaPg(pool);

// Create a real Prisma client for tests
export const testPrisma = new PrismaClient({
  adapter,
  log: ['error'],
});

beforeAll(async () => {
  await testPrisma.$connect();
});

beforeEach(async () => {
  // Clean up all data before each test using transactions
  await testPrisma.$transaction([
    testPrisma.citizen.deleteMany(),
    testPrisma.zoneItem.deleteMany(),
    testPrisma.bankItem.deleteMany(),
    testPrisma.zone.deleteMany(),
    testPrisma.town.deleteMany(),
    testPrisma.user.deleteMany(),
  ]);

  // Flush cache between tests
  const { flushCache } = await import('../src/utils/cache.js');
  flushCache();
});

afterAll(async () => {
  await testPrisma.$disconnect();
  await pool.end();
});
