# Transaction-Based Test Isolation

This document provides guidance on implementing transaction-based isolation for tests in the Zenith API application.

## Why Use Transaction-Based Isolation?

Traditional test isolation approaches often involve cleaning up the database after each test by deleting test data. This approach has several drawbacks:

1. **Performance**: Repeatedly inserting and deleting data is slow
2. **Complexity**: Cleanup logic can be complex and error-prone
3. **Reliability**: Tests may fail if cleanup doesn't execute properly
4. **Concurrency**: Multiple test suites running in parallel can interfere with each other

Transaction-based isolation provides a cleaner solution by:

1. Starting a database transaction before each test
2. Running the test within the transaction
3. Rolling back the transaction after the test completes, regardless of success or failure

This ensures that no changes are actually committed to the database, making tests faster and more reliable.

## Implementation Steps

### 1. Create Transaction Helper

Use the existing `createTestTransaction` function in `test/test-utils.ts`:

```typescript
export async function createTestTransaction(app: INestApplication) {
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  return {
    queryRunner,
    async commit() {
      await queryRunner.commitTransaction();
      await queryRunner.release();
    },
    async rollback() {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    },
  };
}
```

### 2. Implement in Test Files

#### Setup Transaction in beforeEach

```typescript
describe('Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    app = await getTestApp();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  // Test cases...
});
```

### 3. Pass QueryRunner to Repository Operations

To ensure all database operations use the same transaction:

```typescript
// Example repository operation within a test
const repository = queryRunner.manager.getRepository(Entity);
const result = await repository.find();
```

### 4. Fallback Cleanup Logic

As a safety measure, implement cleanup logic in case transaction rollback fails:

```typescript
const createdEntities: { id: string; type: string }[] = [];

afterAll(async () => {
  // Only attempt cleanup if we have created entities
  if (createdEntities.length > 0) {
    console.log('Cleaning up test data...');

    // Get repositories
    const taskRepo = app.get(getRepositoryToken(Task));
    const projectRepo = app.get(getRepositoryToken(Project));
    const tagRepo = app.get(getRepositoryToken(Tag));

    // Delete entities by type
    for (const entity of createdEntities) {
      try {
        if (entity.type === 'task') {
          await taskRepo.delete(entity.id);
        } else if (entity.type === 'project') {
          await projectRepo.delete(entity.id);
        } else if (entity.type === 'tag') {
          await tagRepo.delete(entity.id);
        }
      } catch (error) {
        console.error(`Error deleting ${entity.type} ${entity.id}:`, error);
      }
    }
  }
});
```

## Example: Updated Test Structure

```typescript
describe('MyFeature Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  const createdEntities: { id: string; type: string }[] = [];

  beforeAll(async () => {
    app = await getTestApp(true); // Use mocked services
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it('should create a new entity', async () => {
    // Test logic using queryRunner.manager
    const result = await someOperation();

    // Track entity for fallback cleanup
    createdEntities.push({ id: result.id, type: 'entity' });

    expect(result).toBeDefined();
  });

  // Cleanup logic in afterAll as shown above
});
```

## Benefits of This Approach

1. **Speed**: Tests run faster without committing data
2. **Isolation**: Each test runs in its own transaction
3. **Reliability**: No need for complex cleanup logic
4. **Simplicity**: Less code needed for test setup and teardown
5. **Concurrency**: Tests can run in parallel without interference
