# Testing Guide

This project uses Vitest for testing with a real PostgreSQL database running in Docker.

## Setup

### Prerequisites

- Docker installed and running
- pnpm package manager

### Test Database

Tests use a real PostgreSQL database running in a Docker container. The database is automatically:

- Started before tests run (via globalSetup)
- Migrated with the latest schema
- Cleaned up after tests complete (via globalSetup teardown)
- Isolated from your development database (runs on port 5433)

### Test Behavior

The test setup automatically:

- Starts a PostgreSQL container using Docker Compose
- Runs Prisma migrations
- Clears all data before each test
- Closes connections and removes the container after all tests complete

**Important**: The Docker container is automatically cleaned up even if tests fail, ensuring no orphaned containers are left behind.

## Running Tests

```bash
# Run tests in watch mode (recommended during development)
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### Manual Database Management

If you need to manually manage the test database:

```bash
# Start the test database
pnpm test:db:start

# Stop and clean up the test database
pnpm test:db:stop

# Reset the test database (stop, start, and migrate)
pnpm test:db:reset
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
    // Create test data using testPrisma (real database operations)
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

The `testPrisma` instance is a real Prisma client connected to the PostgreSQL test database:

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

- Uses PostgreSQL in Docker (same as production)
- Database runs on port 5433 (to avoid conflict with development database on 5432)
- Uses tmpfs for fast in-memory storage
- Container is automatically started before tests and cleaned up after
- Uses the same schema as production (`prisma/schema.prisma`)
- Connection string: `postgresql://test:test@localhost:5433/zen_hordes_test`
- Automatically cleaned before each test to ensure isolation
- Cleanup is guaranteed even if tests fail or are interrupted
