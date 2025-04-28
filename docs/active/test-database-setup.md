# Test Database Setup

This document explains how the test database is configured and used in Zenith API.

## Database Configuration

The Zenith API uses a separate database for testing to ensure test isolation. The test database is named `zenith_test` by default.

### Configuration in TypeORM

The database configuration is defined in `src/config/typeorm.config.ts`. For test environments, the application uses a different database:

```typescript
database:
  process.env.NODE_ENV === 'test'
    ? process.env.PGDATABASE_TEST || process.env.DB_NAME_TEST || 'zenith_test'
    : process.env.PGDATABASE || process.env.DB_NAME || 'zenith_db',
```

### Environment Variables

You can customize the test database name using the following environment variables:

- `PGDATABASE_TEST`: PostgreSQL specific variable for test database name
- `DB_NAME_TEST`: Generic variable for test database name

If neither is set, the default `zenith_test` name will be used.

## Test Database Setup and Teardown

The test database is prepared using scripts in the `test` directory:

- `test/setup-test-db.ts`: Creates a fresh test database and runs migrations
- `test/teardown-test-db.ts`: Cleans up the test database after tests complete

The setup process:

1. Connects to the default PostgreSQL database
2. Terminates any existing connections to the test database
3. Drops the test database if it exists
4. Creates a fresh test database
5. Connects to the new test database
6. Clears the migrations table (if it exists)
7. Runs all migrations to create the schema

## Running Tests with Database

When running tests that require a database connection:

1. Make sure the PostgreSQL server is running
2. The test user has permissions to create and drop databases
3. The test database (`zenith_test`) will be created automatically

### Common Issues and Solutions

#### Database Connection Issues

If tests fail to connect to the database:

1. Check that PostgreSQL is running
2. Verify connection settings (host, port, user, password)
3. Ensure the test user has necessary permissions

#### Database Already Exists Error

If you see an error about the database already existing:

1. The previous test run may have failed to clean up
2. Manually drop the database: `DROP DATABASE zenith_test;`
3. Run the tests again

#### Inconsistent Test Results

If you're getting inconsistent test results:

1. Make sure tests properly clean up their data
2. Consider using transaction-based test isolation

## Integration with CI/CD

In CI/CD environments, the test database is configured in the pipeline:

1. A PostgreSQL service is started for tests
2. Environment variables are set to connect to this service
3. Tests run with a clean database

See the CI configuration files for details on how this is set up.
