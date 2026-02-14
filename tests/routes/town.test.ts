import request from 'supertest';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createTestApp } from '../helpers/test-app.js';
import { testPrisma } from '../setup.js';

const mockGetJson2 = vi.fn();
const mockStatusList = vi.fn();

vi.mock('../../src/utils/api/mh-api.helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/api/mh-api.helper.js')>();
  return {
    ...actual,
    createMHApi: vi.fn(() => ({
      json: {
        statusList: mockStatusList,
        getJson2: mockGetJson2,
      },
    })),
  };
});

describe('Town Route', () => {
  const app = createTestApp();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock API responses
    mockStatusList.mockResolvedValue({
      data: { attack: false, maintain: false },
    });

    mockGetJson2.mockResolvedValue({
      data: {
        id: 100,
        date: '2026-01-01 00:00:00',
        season: 1,
        phase: 'NATIVE',
        wid: 10,
        hei: 10,
        city: {
          name: 'Test Town',
          x: 0,
          y: 0,
          type: 'SMALL',
          bank: [],
          water: 0,
          chaos: 0,
          devast: false,
          door: false,
        },
        zones: [],
        citizens: [{ id: 1, x: 0, y: 0 }],
      },
    });

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
        lastUpdate: new Date(),
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
        key: 'xxxx',
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

  it('should cache town data on second request', async () => {
    // First request
    const response1 = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 1,
        key: 'xxxx',
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
        key: 'xxxx',
      })
      .expect(200);

    // Verify the database wasn't called again (cache was used)
    expect(findUniqueMock.mock.calls.length).toBe(findUniqueCalls);

    // Verify both responses are identical
    expect(response1.body).toEqual(response2.body);
  });

  it('should pass when user is a citizen of the town', async () => {
    await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 1,
        key: 'xxxx',
      })
      .expect(200);
  });

  it('should reject when user is not a citizen and town is full (40+ citizens)', async () => {
    // Create a town with 40 citizens
    for (let i = 2; i <= 41; i++) {
      await testPrisma.user.create({
        data: {
          id: i,
          name: `User ${i}`,
          locale: 'EN',
          key: `key-${i}`,
        },
      });
    }

    const citizens = Array.from({ length: 40 }, (_, i) => ({
      userId: i + 2,
      townId: 100,
      x: 0,
      y: 0,
    }));

    for (const citizen of citizens) {
      await testPrisma.citizen.create({ data: citizen });
    }

    const response = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 999, // User not in town
        key: 'xxxx',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User is not a citizen of the town',
    });
  });

  it('should reject when user not in town, town not full, but API confirms user not in town', async () => {
    // Town has only 1 citizen (less than 40)
    // Mock API to return citizens list without user 999
    mockGetJson2.mockResolvedValueOnce({
      data: {
        id: 100,
        city: {
          bank: [],
          water: 0,
          chaos: 0,
          devast: false,
          door: false,
        },
        zones: [],
        citizens: [{ id: 1, x: 0, y: 0 }], // User 999 not in list
      },
    });

    const response = await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 999, // User not in town
        key: 'xxxx',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User is not a citizen of the town',
    });
  });

  it('should pass when user not initially in town, town not full, and API adds user', async () => {
    // Mock API to return citizens list with user 999 added
    mockGetJson2.mockResolvedValueOnce({
      data: {
        id: 100,
        city: {
          bank: [],
          water: 0,
          chaos: 0,
          devast: false,
          door: false,
        },
        zones: [],
        citizens: [
          { id: 1, x: 0, y: 0 },
          { id: 999, x: 0, y: 0 }, // User 999 now in town
        ],
      },
    });

    // Create user 999 first
    await testPrisma.user.create({
      data: {
        id: 999,
        name: 'New User',
        locale: 'EN',
        key: 'new-key',
      },
    });

    await request(app)
      .post('/town')
      .send({
        townId: 100,
        userId: 999,
        key: 'xxxx',
      })
      .expect(200);

    // Verify citizen was created
    const citizen = await testPrisma.citizen.findUnique({
      where: {
        userId_townId: {
          userId: 999,
          townId: 100,
        },
      },
    });

    expect(citizen).toBeDefined();
  });
});
