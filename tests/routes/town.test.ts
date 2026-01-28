import request from 'supertest';
import { beforeEach, describe, expect, it, Mock } from 'vitest';
import { createTestApp } from '../helpers/test-app.js';
import { testPrisma } from '../setup.js';

describe('Town Route', () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Create test data
    await testPrisma.user.create({
      data: {
        id: 1,
        name: 'Test User',
        locale: 'EN',
        key: 'test-key',
      },
    });

    await testPrisma.town.create({
      data: {
        id: 100,
        name: 'Test Town',
        start: new Date('2026-01-01'),
        season: 1,
        phase: 'NATIVE',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        type: 'SMALL',
        citizens: {
          create: {
            userId: 1,
            x: 0,
            y: 0,
          },
        },
        zones: {
          create: [
            {
              x: 1,
              y: 1,
              visitedToday: true,
              dangerLevel: 2,
              zombies: 3,
              depleted: false,
              items: {
                create: [
                  {
                    id: 10,
                    quantity: 2,
                    broken: false,
                  },
                ],
              },
            },
          ],
        },
        bank: {
          create: [
            {
              id: 5,
              quantity: 10,
              broken: false,
            },
          ],
        },
      },
    });
  });

  it('should return town data for authorized citizen', async () => {
    const response = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 1,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      town: {
        id: 100,
        name: 'Test Town',
        season: 1,
        width: 10,
        height: 10,
        zones: expect.arrayContaining([
          expect.objectContaining({
            x: 1,
            y: 1,
            zombies: 3,
            items: expect.arrayContaining([
              expect.objectContaining({
                id: 10,
                quantity: 2,
              }),
            ]),
          }),
        ]),
        bank: expect.arrayContaining([
          expect.objectContaining({
            id: 5,
            quantity: 10,
          }),
        ]),
        citizens: expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            x: 0,
            y: 0,
          }),
        ]),
      },
    });
  });

  it('should return 403 for unauthorized user', async () => {
    const response = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 999, // Non-existent user
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User is not a citizen of this town',
    });
  });

  it('should cache town data on second request', async () => {
    // First request
    const response1 = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 1,
      })
      .expect(200);

    // Clear mock call history after first request
    const findUniqueMock = testPrisma.town.findUnique as Mock;
    const findUniqueCalls = findUniqueMock.mock.calls.length;

    // Second request should hit cache
    const response2 = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 1,
      })
      .expect(200);

    // Verify the database wasn't called again (cache was used)
    expect(findUniqueMock.mock.calls.length).toBe(findUniqueCalls);

    // Verify both responses are identical
    expect(response1.body).toEqual(response2.body);
  });
});
