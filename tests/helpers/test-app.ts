import express, { Express } from 'express';
import { vi } from 'vitest';
import { testPrisma } from '../setup.js';
import { townRouter } from '../../src/routes/town.route.js';
import { mapsRouter } from '../../src/routes/maps.route.js';
import { updateRouter } from '../../src/routes/update.route.js';

// Mock the prisma instance with the test prisma
vi.mock('../../src/utils/prisma.js', () => ({
  prisma: testPrisma,
}));

export const createTestApp = (): Express => {
  const app = express();

  app.use(express.json());

  // Register routes
  app.use('/town', townRouter);
  app.use('/maps', mapsRouter);
  app.use('/update', updateRouter);

  return app;
};
