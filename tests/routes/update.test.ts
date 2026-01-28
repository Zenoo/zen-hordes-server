import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { testPrisma } from '../setup.js';

vi.mock('../../src/utils/api/mh-api.helper.js', () => ({
  createMHApi: vi.fn(() => ({
    json: {
      statusList: vi.fn(async () => ({
        data: { attack: false, maintain: false },
      })),
      me: vi.fn(async () => ({
        data: {
          id: 1,
          name: 'Test User',
          locale: 'en',
          avatar: null,
        },
      })),
    },
  })),
}));

vi.mock('../../src/utils/town.js', () => ({
  createTown: vi.fn(async () => ({})),
}));

vi.mock('../../src/utils/user.js', () => ({
  createUser: vi.fn(async () => ({
    id: 1,
    name: 'Test User',
    locale: 'EN',
    key: 'test-key',
  })),
}));

describe('Update Route', () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Create test user
    await testPrisma.user.create({
      data: {
        id: 1,
        name: 'Test User',
        locale: 'EN',
        key: 'test-key',
      },
    });

    // Create test town
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
      },
    });
  });

  it('should create a new zone with danger level 1 for 1-2 zombies', async () => {
    const response = await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 1,
        y: 1,
        zombies: 1,
        depleted: false,
        items: [
          { id: 10, quantity: 2, broken: false },
          { id: 11, quantity: 1, broken: true },
        ],
      })
      .expect(200);

    expect(response.body).toEqual({ success: true });

    // Verify zone was created in database
    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 1,
          y: 1,
        },
      },
      include: {
        items: true,
      },
    });

    expect(zone).toBeDefined();
    expect(zone).toMatchObject({
      townId: 100,
      x: 1,
      y: 1,
      zombies: 1,
      dangerLevel: 1,
      visitedToday: true,
      depleted: false,
      updatedById: 1,
    });

    expect(zone?.items).toHaveLength(2);
    expect(zone?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ quantity: 2, broken: false }),
        expect.objectContaining({ quantity: 1, broken: true }),
      ])
    );
  });

  it('should create a zone with danger level 2 for 3-5 zombies', async () => {
    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 2,
        y: 2,
        zombies: 4,
        depleted: true,
        items: [],
      })
      .expect(200);

    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 2,
          y: 2,
        },
      },
    });

    expect(zone?.dangerLevel).toBe(2);
    expect(zone?.zombies).toBe(4);
    expect(zone?.depleted).toBe(true);
  });

  it('should create a zone with danger level 3 for 6+ zombies', async () => {
    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 3,
        y: 3,
        zombies: 10,
        depleted: false,
        buildingId: 5,
        items: [],
      })
      .expect(200);

    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 3,
          y: 3,
        },
      },
    });

    expect(zone?.dangerLevel).toBe(3);
    expect(zone?.zombies).toBe(10);
    expect(zone?.buildingId).toBe(5);
  });

  it('should update an existing zone', async () => {
    // Create initial zone
    await testPrisma.zone.create({
      data: {
        townId: 100,
        x: 4,
        y: 4,
        zombies: 2,
        visitedToday: false,
        dangerLevel: 1,
        depleted: false,
        items: {
          create: [{ id: 20, quantity: 1, broken: false }],
        },
      },
    });

    // Update zone
    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 4,
        y: 4,
        zombies: 8,
        depleted: true,
        items: [
          { id: 21, quantity: 3, broken: false },
          { id: 22, quantity: 1, broken: true },
        ],
      })
      .expect(200);

    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 4,
          y: 4,
        },
      },
      include: {
        items: true,
      },
    });

    expect(zone).toMatchObject({
      zombies: 8,
      dangerLevel: 3,
      visitedToday: true,
      depleted: true,
      updatedById: 1,
    });

    // Verify old items were replaced
    expect(zone?.items).toHaveLength(2);
    expect(zone?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ quantity: 3, broken: false }),
        expect.objectContaining({ quantity: 1, broken: true }),
      ])
    );
  });

  it('should update both town and town-map caches', async () => {
    // Pre-populate caches
    const townCache = {
      success: true,
      town: {
        id: 100,
        zones: [],
      },
    };
    const mapCache = {
      id: 100,
      zones: [],
    };

    // Manually set caches (simulating previous requests)
    vi.mock('../../src/utils/cache.js', async (importOriginal) => {
      const actual = (await importOriginal()) as typeof import('../../src/utils/cache.js');
      return {
        ...actual,
        getCached: vi.fn((key: string) => {
          if (key === 'town:100') return townCache;
          if (key === 'town-map:100') return mapCache;
          return undefined;
        }),
        setCached: vi.fn(),
      };
    });

    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 5,
        y: 5,
        zombies: 3,
        depleted: false,
        items: [{ id: 30, quantity: 1, broken: false }],
      })
      .expect(200);

    // Verify database was updated
    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 5,
          y: 5,
        },
      },
    });

    expect(zone).toBeDefined();
    expect(zone?.zombies).toBe(3);
    expect(zone?.dangerLevel).toBe(2);
  });

  it('should return 503 when MyHordes API is unavailable', async () => {
    // Import and mock the API helper to return unavailable status for this test
    const { createMHApi } = await import('../../src/utils/api/mh-api.helper.js');
    const mockCreateMHApi = vi.mocked(createMHApi);

    mockCreateMHApi.mockReturnValueOnce({
      json: {
        statusList: vi.fn(async () => ({
          data: { attack: true, maintain: false },
        })),
        me: vi.fn(async () => ({
          data: {
            id: 1,
            name: 'Test User',
            locale: 'en',
            avatar: null,
          },
        })),
      },
    } as never);

    const response = await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 6,
        y: 6,
        zombies: 1,
        depleted: false,
        items: [],
      })
      .expect(503);

    expect(response.body).toMatchObject({
      success: false,
      error: 'MyHordes API is currently unavailable',
    });

    // Verify zone was NOT created
    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 6,
          y: 6,
        },
      },
    });

    expect(zone).toBeNull();
  });

  it('should handle zone with no items', async () => {
    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 7,
        y: 7,
        zombies: 0,
        depleted: true,
        items: [],
      })
      .expect(200);

    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 7,
          y: 7,
        },
      },
      include: {
        items: true,
      },
    });

    expect(zone).toBeDefined();
    expect(zone?.dangerLevel).toBe(0);
    expect(zone?.items).toHaveLength(0);
  });
});
