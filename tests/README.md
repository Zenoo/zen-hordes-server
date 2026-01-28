# Testing Guide

This project uses Vitest for testing with mocked Prisma client for database operations.

## Setup

### No External Dependencies Required

Tests use a mocked Prisma client with in-memory data storage. No external database is needed.

### Test Behavior

The test setup automatically:

- Creates a mock Prisma client with in-memory storage
- Clears all data before each test
- Resets all mock call histories
- Runs completely isolated and independently

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { testPrisma } from '../setup.js';

describe('My Route', () => {
  const app = createTestApp();

  beforeEach(async () => {
    // Create test data using testPrisma
    await testPrisma.user.create({
      data: {
        id: 1,
        name: 'Test User',
        locale: 'EN',
        key: 'test-key',
      },
    });
  });

  it('should do something', async () => {
    const response = await request(app).post('/endpoint').send({ data: 'test' }).expect(200);

    expect(response.body).toMatchObject({ success: true });
  });
});
```

### Using Test Prisma

The `testPrisma` instance is a Prisma client connected to an SQLite database:

```typescript
import { testPrisma } from '../setup.js';

// Create data
await testPrisma.town.create({ data: { ... } });

// Query data
const town = await testPrisma.town.findUnique({ where: { id: 1 } });

// Clean specific data
await testPrisma.town.deleteMany();
```

### Testing HTTP Endpoints

Use `supertest` to make HTTP requests:

```typescript
import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';

const app = createTestApp();

const response = await request(app).post('/town').send({ townId: 100, userId: 1 }).expect(200);

expect(response.body.success).toBe(true);
```

## Test Database

- Uses SQLite instead of PostgreSQL for faster tests
- Database is created as `test.db` and cleaned up after tests
- Uses the same schema as production (`prisma/schema.prisma`)
- SQLite is specified via `DATABASE_URL` environment variable at test time
- Automatically cleaned before each test to ensure isolation
