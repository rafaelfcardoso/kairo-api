# Testing Best Practices

## Handling Database Connections in Tests

We've noticed persistent issues with open database connections in our test suite. The main symptom is Jest reporting "open handles" warnings related to PostgreSQL TCP connections. This document provides guidance on properly managing database connections in tests.

### Current Issues

1. **Open PostgreSQL Connections**: Tests are leaving open PostgreSQL connections (TCPWRAP handles), preventing Jest from exiting cleanly.
2. **Connection Pooling**: Each test file initializes its own database connection through TypeORM, creating multiple connection pools.
3. **Incomplete Cleanup**: Even with `afterAll` blocks to close the NestJS app, the underlying database connections are not fully terminated.

### Implemented Solutions

We've implemented the following solutions to address these issues:

1. **Shared Test Application**: Created a `test/test-utils.ts` file that manages a single database connection across all tests.
2. **Global Setup/Teardown**: Added `jest-global-setup.ts` and `jest-global-teardown.ts` files to initialize and close database connections.
3. **Connection Pool Draining**: Explicitly drain PostgreSQL connection pools before closing the DataSource.
4. **Additional Cleanup Time**: Added delays after closing connections to ensure all resources are released.
5. **Garbage Collection**: Trigger garbage collection after tests to clean up remaining resources.

### Additional Recommended Solutions

1. **Use Transaction Rollbacks for Test Isolation**:

Instead of creating and deleting entities, wrap tests in transactions:

```typescript
beforeEach(async () => {
  // Start a transaction
  await queryRunner.startTransaction();
});

afterEach(async () => {
  // Rollback after each test
  await queryRunner.rollbackTransaction();
});
```

2. **Use Direct API Calls When Possible**:

For tests that don't specifically test NLP functionality, use direct API calls instead of the NLP endpoints to avoid AI service failures.

### Implementation Details

#### 1. Shared Test Module

```typescript
// test/test-utils.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

let app: INestApplication;
let testingModule: TestingModule;
let isInitialized = false;

export async function getTestApp(): Promise<INestApplication> {
  if (!isInitialized) {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    isInitialized = true;
  }

  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    // Close PostgreSQL connections directly
    try {
      const dataSource = app.get(DataSource);
      if (dataSource && dataSource.isInitialized) {
        // Close all PostgreSQL connections directly
        if (dataSource.driver && dataSource.driver['master']) {
          const pool = dataSource.driver['master'].pool;
          if (pool) {
            await new Promise<void>((resolve) => {
              pool.end(() => resolve());
            });
          }
        }

        await dataSource.destroy();
      }
    } catch (error) {
      console.error('Error closing TypeORM connections:', error);
    }

    await app.close();
    app = null;
    testingModule = null;
    isInitialized = false;
  }
}
```

#### 2. Global Setup/Teardown

```typescript
// jest-global-setup.ts
import { getTestApp } from './test/test-utils';

module.exports = async () => {
  await getTestApp();
};

// jest-global-teardown.ts
import { closeTestApp } from './test/test-utils';

module.exports = async () => {
  await closeTestApp();

  // Allow time for connections to fully close
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Force cleanup of any remaining handles
  if (global.gc) {
    global.gc();
  }
};
```

#### 3. Updated Jest Configuration

```json
{
  "globalSetup": "<rootDir>/jest-global-setup.ts",
  "globalTeardown": "<rootDir>/jest-global-teardown.ts",
  "forceExit": true,
  "detectOpenHandles": true
}
```

### Usage in Test Files

```typescript
import { INestApplication } from '@nestjs/common';
import { getTestApp } from '../../../test/test-utils';

describe('Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    // Don't close the app here - it's managed by the global teardown
  });

  // Test cases here
});
```

By implementing these changes, we've reduced the number of open handles and improved test reliability.
