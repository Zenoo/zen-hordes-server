import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { testPrisma } from '../setup.js';
import { getCached } from '../../src/utils/cache.js';

vi.mock('../../src/utils/api/mh-api.helper.js', () => ({
  createMHApi: vi.fn(() => ({
    json: {
      statusList: vi.fn(async () => ({
        data: { attack: false, maintain: false },
      })),
    },
  })),
}));

vi.mock('../../src/utils/town.js', () => ({
  getOrCreateTown: vi.fn(async () => ({})),
}));

describe('Maps Route', () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Create test users
    await testPrisma.user.create({
      data: {
        id: 1,
        name: 'Test User 1',
        locale: 'EN',
        key: 'test-key-1',
      },
    });

    await testPrisma.user.create({
      data: {
        id: 2,
        name: 'Test User 2',
        locale: 'EN',
        key: 'test-key-2',
      },
    });

    // Create test towns
    await testPrisma.town.create({
      data: {
        id: 100,
        name: 'Test Town 1',
        start: new Date('2026-01-01'),
        season: 1,
        phase: 'NATIVE',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        type: 'SMALL',
        zones: {
          create: [
            {
              x: 1,
              y: 1,
              visitedToday: true,
              dangerLevel: 2,
              zombies: 3,
              depleted: false,
              buildingId: 5,
            },
            {
              x: 2,
              y: 1,
              visitedToday: false,
              dangerLevel: 1,
              zombies: 1,
              depleted: true,
            },
          ],
        },
        citizens: {
          create: {
            userId: 1,
            x: 0,
            y: 0,
          },
        },
      },
    });

    await testPrisma.town.create({
      data: {
        id: 101,
        name: 'Test Town 2',
        start: new Date('2026-01-02'),
        season: 2,
        phase: 'NATIVE',
        width: 12,
        height: 12,
        x: 5,
        y: 5,
        type: 'SMALL',
        zones: {
          create: [
            {
              x: 3,
              y: 3,
              visitedToday: true,
              dangerLevel: 3,
              zombies: 10,
              depleted: false,
            },
          ],
        },
        citizens: {
          create: {
            userId: 2,
            x: 5,
            y: 5,
          },
        },
      },
    });
  });

  it('should return zones for multiple towns', async () => {
    const response = await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [100, 101],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      towns: expect.arrayContaining([
        {
          id: 100,
          width: 10,
          height: 10,
          x: 0,
          y: 0,
          zones: expect.arrayContaining([
            {
              x: 1,
              y: 1,
              visitedToday: true,
              dangerLevel: 2,
              buildingId: 5,
            },
            {
              x: 2,
              y: 1,
              visitedToday: false,
              dangerLevel: 1,
              buildingId: null,
            },
          ]),
          citizens: [{ x: 0, y: 0 }],
        },
        {
          id: 101,
          width: 12,
          height: 12,
          x: 5,
          y: 5,
          zones: [
            {
              x: 3,
              y: 3,
              visitedToday: true,
              dangerLevel: 3,
              buildingId: null,
            },
          ],
          citizens: [{ x: 5, y: 5 }],
        },
      ]),
    });

    // Verify data was fetched from database
    expect((testPrisma.town.findMany as Mock).mock.calls.length).toBeGreaterThan(0);
  });

  it('should cache individual towns', async () => {
    // First request
    await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [100, 101],
      })
      .expect(200);

    // Verify both towns are cached
    const cachedTown100 = getCached('town-map:100');
    const cachedTown101 = getCached('town-map:101');

    expect(cachedTown100).toBeDefined();
    expect(cachedTown100).toMatchObject({
      id: 100,
      width: 10,
      height: 10,
    });

    expect(cachedTown101).toBeDefined();
    expect(cachedTown101).toMatchObject({
      id: 101,
      width: 12,
      height: 12,
    });
  });

  it('should use cached data on subsequent requests', async () => {
    // First request to populate cache
    await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [100],
      })
      .expect(200);

    const findManyCalls = (testPrisma.town.findMany as Mock).mock.calls.length;

    // Second request should use cache
    const response = await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [100],
      })
      .expect(200);

    // Verify database wasn't called again
    expect((testPrisma.town.findMany as Mock).mock.calls.length).toBe(findManyCalls);

    expect(response.body.towns).toHaveLength(1);
    expect(response.body.towns[0].id).toBe(100);
  });

  it('should handle mix of cached and uncached towns', async () => {
    // Cache town 100
    await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [100],
      })
      .expect(200);

    const findManyCallsBefore = (testPrisma.town.findMany as Mock).mock.calls.length;

    // Request both town 100 (cached) and 101 (not cached)
    const response = await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [100, 101],
      })
      .expect(200);

    const findManyCallsAfter = (testPrisma.town.findMany as Mock).mock.calls.length;

    // Verify database was called for uncached town 101
    // Both towns should be cached after first request
    expect(findManyCallsAfter).toBeGreaterThan(findManyCallsBefore);

    // Verify both towns are in response
    expect(response.body.towns).toHaveLength(2);
    expect(response.body.towns.map((t: { id: number }) => t.id)).toContain(100);
    expect(response.body.towns.map((t: { id: number }) => t.id)).toContain(101);
  });

  it('should return empty array for non-existent towns', async () => {
    const response = await request(app)
      .post('/maps')
      .send({
        key: 'test-key',
        townIds: [999],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      towns: [],
    });
  });
});
