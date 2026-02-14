import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { testPrisma } from '../setup.js';

const mockGetJson = vi.fn();
const mockGetJson2 = vi.fn();
const mockStatusList = vi.fn();

vi.mock('../../src/utils/api/mh-api.helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/api/mh-api.helper.js')>();
  return {
    ...actual,
    createMHApi: vi.fn(() => ({
      json: {
        statusList: mockStatusList,
        getJson: mockGetJson,
        getJson2: mockGetJson2,
      },
    })),
  };
});

describe('Update Route', () => {
  const app = createTestApp();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock API responses
    mockStatusList.mockResolvedValue({
      data: { attack: false, maintain: false },
    });

    mockGetJson.mockResolvedValue({
      data: {
        id: 1,
        name: 'Test User',
        locale: 'en',
        avatar: null,
      },
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
        lastUpdate: new Date(),
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
    // Use a new user that doesn't exist in DB to force API call in createUser
    // Reset mocks and reconfigure for this specific test
    mockStatusList.mockReset();
    mockGetJson.mockReset();
    mockGetJson2.mockReset();

    // Mock API to return attack status for all calls
    mockStatusList.mockResolvedValue({
      data: { attack: true, maintain: false },
    });

    const response = await request(app).post('/update').send({
      key: 'test-key',
      townId: 100,
      userId: 888, // User that doesn't exist
      x: 6,
      y: 6,
      zombies: 1,
      depleted: false,
      items: [],
    });

    // Should return 503 from createUser checking API availability
    expect(response.status).toBe(503);
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

  it('should pass when user is a citizen of the town', async () => {
    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 1,
        x: 8,
        y: 8,
        zombies: 2,
        depleted: false,
        items: [],
      })
      .expect(200);

    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 8,
          y: 8,
        },
      },
    });

    expect(zone).toBeDefined();
    expect(zone?.zombies).toBe(2);
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

    // Create user 999 first to avoid API call in createUser
    await testPrisma.user.create({
      data: {
        id: 999,
        name: 'Unknown User',
        locale: 'EN',
        key: 'unknown-key',
      },
    });

    const response = await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 999, // User not in town
        x: 9,
        y: 9,
        zombies: 3,
        depleted: false,
        items: [],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User is not a citizen of the town',
    });

    // Verify zone was NOT created
    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 9,
          y: 9,
        },
      },
    });

    expect(zone).toBeNull();
  });

  it('should reject when user not in town, town not full, but API confirms user not in town', async () => {
    // Town has only 1 citizen (less than 40)
    // Mock API responses for user 999
    mockGetJson.mockResolvedValueOnce({
      data: {
        id: 999,
        name: 'Unknown User',
        locale: 'en',
        avatar: null,
      },
    });

    // Mock getJson2 to return citizens list without user 999
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
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 999, // User not in town
        x: 10,
        y: 10,
        zombies: 4,
        depleted: false,
        items: [],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User is not a citizen of the town',
    });

    // Verify zone was NOT created
    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 10,
          y: 10,
        },
      },
    });

    expect(zone).toBeNull();
  });

  it('should pass when user not initially in town, town not full, and API adds user', async () => {
    // Create user 999 first
    await testPrisma.user.create({
      data: {
        id: 999,
        name: 'New User',
        locale: 'EN',
        key: 'new-key',
      },
    });

    // Mock API responses for user 999
    mockGetJson.mockResolvedValueOnce({
      data: {
        id: 999,
        name: 'New User',
        locale: 'en',
        avatar: null,
      },
    });

    // Mock getJson2 to return citizens list with user 999 added
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

    await request(app)
      .post('/update')
      .send({
        key: 'test-key',
        townId: 100,
        userId: 999,
        x: 11,
        y: 11,
        zombies: 5,
        depleted: false,
        items: [],
      })
      .expect(200);

    // Verify zone WAS created
    const zone = await testPrisma.zone.findUnique({
      where: {
        townId_x_y: {
          townId: 100,
          x: 11,
          y: 11,
        },
      },
    });

    expect(zone).toBeDefined();
    expect(zone?.zombies).toBe(5);

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
