import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';

type MockRecord = Record<string, unknown>;

type MockDataStore = {
  users: Map<number, MockRecord>;
  towns: Map<number, MockRecord>;
  citizens: Map<number, MockRecord>;
  zones: Map<number, MockRecord>;
  zoneItems: Map<number, MockRecord>;
  bankItems: Map<number, MockRecord>;
};

type CreateArgs = {
  data: MockRecord;
};

type FindUniqueArgs = {
  where: {
    id?: number;
    userId_townId?: {
      userId: number;
      townId: number;
    };
    townId_x_y?: {
      townId: number;
      x: number;
      y: number;
    };
  };
  include?: {
    citizens?: boolean | { include?: { user?: boolean } };
    zones?: boolean | { include?: { items?: boolean } };
    bank?: boolean;
    items?: boolean;
  };
};

type FindManyArgs = {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: {
    citizens?: boolean | { select?: Record<string, boolean>; include?: { user?: boolean } };
    zones?: boolean | { select?: Record<string, boolean> };
    bank?: boolean;
    items?: boolean;
  };
};

type UpdateArgs = {
  where: { id: number };
  data: MockRecord;
};

type UpsertArgs = {
  where: {
    id?: number;
    townId_x_y?: {
      townId: number;
      x: number;
      y: number;
    };
  };
  create: MockRecord;
  update: MockRecord;
};

type DeleteArgs = {
  where: { id: number };
};

// Create a mock Prisma client with in-memory storage
const mockData: MockDataStore = {
  users: new Map(),
  towns: new Map(),
  citizens: new Map(),
  zones: new Map(),
  zoneItems: new Map(),
  bankItems: new Map(),
};

let nextId = {
  users: 1,
  towns: 1,
  citizens: 1,
  zones: 1,
  zoneItems: 1,
  bankItems: 1,
};

// Helper to create mock methods for a model
const createMockModel = (storeName: keyof MockDataStore) => ({
  create: vi.fn(async ({ data }: CreateArgs) => {
    const id = (data.id as number | undefined) || nextId[storeName]++;
    const record: MockRecord = { ...data, id };

    // Handle nested creates
    if (data.citizens && typeof data.citizens === 'object' && 'create' in data.citizens) {
      const citizenData = data.citizens.create as MockRecord;
      const citizenId = (citizenData.id as number | undefined) || nextId.citizens++;
      const citizen: MockRecord = { ...citizenData, id: citizenId, townId: id };
      mockData.citizens.set(citizenId, citizen);
      record.citizens = [citizen];
    }
    if (data.zones && typeof data.zones === 'object' && 'create' in data.zones) {
      const zonesCreate = data.zones.create as MockRecord[];
      record.zones = [];
      for (const zoneData of zonesCreate) {
        const zoneId = (zoneData.id as number | undefined) || nextId.zones++;
        const zone: MockRecord = { ...zoneData, id: zoneId, townId: id };

        // Handle nested zone items
        if (zoneData.items && typeof zoneData.items === 'object' && 'create' in zoneData.items) {
          const itemsCreate = zoneData.items.create as MockRecord[];
          zone.items = [];
          for (const itemData of itemsCreate) {
            const itemId = (itemData.id as number | undefined) || nextId.zoneItems++;
            const item: MockRecord = { ...itemData, id: itemId, zoneId };
            mockData.zoneItems.set(itemId, item);
            (zone.items as MockRecord[]).push(item);
          }
        }

        mockData.zones.set(zoneId, zone);
        (record.zones as MockRecord[]).push(zone);
      }
    }
    if (data.bank && typeof data.bank === 'object' && 'create' in data.bank) {
      const bankCreate = data.bank.create as MockRecord[];
      record.bank = [];
      for (const bankData of bankCreate) {
        const itemId = (bankData.id as number | undefined) || nextId.bankItems++;
        const item: MockRecord = { ...bankData, id: itemId, townId: id };
        mockData.bankItems.set(itemId, item);
        (record.bank as MockRecord[]).push(item);
      }
    }

    mockData[storeName].set(id, record);
    return record;
  }),
  findUnique: vi.fn(async ({ where, include }: FindUniqueArgs) => {
    let record: MockRecord | undefined;

    // Handle composite keys
    if (where.userId_townId) {
      record = Array.from(mockData[storeName].values()).find(
        (r) => r.userId === where.userId_townId?.userId && r.townId === where.userId_townId?.townId
      );
    } else if (where.townId_x_y) {
      record = Array.from(mockData[storeName].values()).find(
        (r) => r.townId === where.townId_x_y?.townId && r.x === where.townId_x_y?.x && r.y === where.townId_x_y?.y
      );
    } else if (where.id !== undefined) {
      record = mockData[storeName].get(where.id);
    }

    if (!record) return null;

    const result: MockRecord = { ...record };

    // Handle includes
    if (include) {
      if (include.citizens) {
        result.citizens = Array.from(mockData.citizens.values()).filter((c) => c.townId === record?.id);
        // Handle nested include for user
        if (typeof include.citizens === 'object' && include.citizens.include?.user) {
          result.citizens = (result.citizens as MockRecord[]).map((c) => ({
            ...c,
            user: mockData.users.get(c.userId as number),
          }));
        }
      }
      if (include.zones) {
        result.zones = Array.from(mockData.zones.values()).filter((z) => z.townId === record?.id);
        if (typeof include.zones === 'object' && include.zones.include?.items) {
          result.zones = (result.zones as MockRecord[]).map((z) => ({
            ...z,
            items: Array.from(mockData.zoneItems.values()).filter((i) => i.zoneId === z.id),
          }));
        }
      }
      if (include.bank) {
        result.bank = Array.from(mockData.bankItems.values()).filter((b) => b.townId === record?.id);
      }
      if (include.items) {
        result.items = Array.from(mockData.zoneItems.values()).filter((i) => i.zoneId === record?.id);
      }
    }

    return result;
  }),
  findMany: vi.fn(async ({ where, select, include }: FindManyArgs = {}) => {
    let records = Array.from(mockData[storeName].values());

    // Filter by where clause
    if (where) {
      records = records.filter((record) => {
        return Object.entries(where).every(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'in' in value) {
            const inArray = (value as { in: unknown[] }).in;
            return inArray.includes(record[key]);
          }
          return record[key] === value;
        });
      });
    }

    // Handle includes and selects
    return records.map((record) => {
      const result: MockRecord = { ...record };

      if (include) {
        if (include.citizens) {
          result.citizens = Array.from(mockData.citizens.values()).filter((c) => c.townId === record.id);
          // Handle nested include for user
          if (typeof include.citizens === 'object' && include.citizens.include?.user) {
            result.citizens = (result.citizens as MockRecord[]).map((c) => ({
              ...c,
              user: mockData.users.get(c.userId as number),
            }));
          }
        }
        if (include.zones) {
          result.zones = Array.from(mockData.zones.values()).filter((z) => z.townId === record.id);
        }
        if (include.bank) {
          result.bank = Array.from(mockData.bankItems.values()).filter((b) => b.townId === record.id);
        }
        if (include.items) {
          result.items = Array.from(mockData.zoneItems.values()).filter((i) => i.zoneId === record.id);
        }
      }

      if (select) {
        const selected: MockRecord = {};
        Object.entries(select).forEach(([key, value]) => {
          if (value === true) {
            selected[key] = result[key];
          } else if (typeof value === 'object' && value !== null) {
            // Handle nested selects (e.g., zones: { select: { x: true, y: true } })
            if (key === 'zones' && result.zones) {
              selected[key] = (result.zones as MockRecord[]).map((zone) => {
                const selectedZone: MockRecord = {};
                Object.entries(value as Record<string, unknown>).forEach(([zoneKey, zoneValue]) => {
                  if (zoneKey === 'select' && typeof zoneValue === 'object') {
                    Object.entries(zoneValue as Record<string, boolean>).forEach(([zoneField, include]) => {
                      if (include) {
                        selectedZone[zoneField] = zone[zoneField];
                      }
                    });
                  }
                });
                return selectedZone;
              });
            } else if (key === 'citizens' && result.citizens) {
              selected[key] = (result.citizens as MockRecord[]).map((citizen) => {
                const selectedCitizen: MockRecord = {};
                Object.entries(value as Record<string, unknown>).forEach(([citizenKey, citizenValue]) => {
                  if (citizenKey === 'select' && typeof citizenValue === 'object') {
                    Object.entries(citizenValue as Record<string, boolean>).forEach(([citizenField, include]) => {
                      if (include) {
                        selectedCitizen[citizenField] = citizen[citizenField];
                      }
                    });
                  }
                });
                return selectedCitizen;
              });
            }
          }
        });
        return selected;
      }

      return result;
    });
  }),
  update: vi.fn(async ({ where, data }: UpdateArgs) => {
    const existing = mockData[storeName].get(where.id);
    if (!existing) throw new Error('Record not found');
    const updated: MockRecord = { ...existing, ...data };
    mockData[storeName].set(where.id, updated);
    return updated;
  }),
  upsert: vi.fn(async ({ where, create, update }: UpsertArgs) => {
    let existing: MockRecord | undefined;

    // Handle composite keys
    if (where.townId_x_y) {
      existing = Array.from(mockData[storeName].values()).find(
        (r) => r.townId === where.townId_x_y?.townId && r.x === where.townId_x_y?.x && r.y === where.townId_x_y?.y
      );
    } else if (where.id !== undefined) {
      existing = mockData[storeName].get(where.id);
    }

    if (existing) {
      // Handle nested operations in update
      const updated: MockRecord = { ...existing };

      for (const [key, value] of Object.entries(update)) {
        if (key === 'items' && typeof value === 'object' && value !== null) {
          const itemsOp = value as Record<string, unknown>;
          // Handle deleteMany
          if (itemsOp.deleteMany !== undefined) {
            const zonedeleteItems = Array.from(mockData.zoneItems.values()).filter((i) => i.zoneId === existing?.id);
            for (const item of zonedeleteItems) {
              mockData.zoneItems.delete(item.id as number);
            }
          }
          // Handle createMany
          if (itemsOp.createMany && typeof itemsOp.createMany === 'object') {
            const createData = (itemsOp.createMany as { data: MockRecord[] }).data;
            for (const itemData of createData) {
              const itemId = nextId.zoneItems++;
              const item: MockRecord = { ...itemData, id: itemId, zoneId: existing?.id };
              mockData.zoneItems.set(itemId, item);
            }
          }
        } else {
          updated[key] = value;
        }
      }

      mockData[storeName].set(existing.id as number, updated);
      return updated;
    } else {
      // Create new record
      const id = (create.id as number | undefined) || nextId[storeName]++;
      const record: MockRecord = { ...create, id };

      // Handle nested createMany for items
      if (create.items && typeof create.items === 'object' && 'createMany' in create.items) {
        const itemsCreate = (create.items as { createMany: { data: MockRecord[] } }).createMany;
        for (const itemData of itemsCreate.data) {
          const itemId = nextId.zoneItems++;
          const item: MockRecord = { ...itemData, id: itemId, zoneId: id };
          mockData.zoneItems.set(itemId, item);
        }
      }

      mockData[storeName].set(id, record);
      return record;
    }
  }),
  delete: vi.fn(async ({ where }: DeleteArgs) => {
    const record = mockData[storeName].get(where.id);
    if (!record) throw new Error('Record not found');
    mockData[storeName].delete(where.id);
    return record;
  }),
  deleteMany: vi.fn(async () => {
    const count = mockData[storeName].size;
    mockData[storeName].clear();
    return { count };
  }),
});

export const testPrisma = {
  user: createMockModel('users'),
  town: createMockModel('towns'),
  citizen: createMockModel('citizens'),
  zone: createMockModel('zones'),
  zoneItem: createMockModel('zoneItems'),
  bankItem: createMockModel('bankItems'),
  $connect: vi.fn(async () => {}),
  $disconnect: vi.fn(async () => {}),
} as unknown as PrismaClient;

beforeAll(async () => {
  await testPrisma.$connect();
});

beforeEach(async () => {
  // Clear all data
  mockData.users.clear();
  mockData.towns.clear();
  mockData.citizens.clear();
  mockData.zones.clear();
  mockData.zoneItems.clear();
  mockData.bankItems.clear();

  // Reset IDs
  nextId = {
    users: 1,
    towns: 1,
    citizens: 1,
    zones: 1,
    zoneItems: 1,
    bankItems: 1,
  };

  // Clear all mock call history
  vi.clearAllMocks();

  // Flush cache between tests
  const { flushCache } = await import('../src/utils/cache.js');
  flushCache();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
