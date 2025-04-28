#!/bin/bash

# Drop and recreate the test database
psql -U postgres -c "DROP DATABASE IF EXISTS zenith_test;"
psql -U postgres -c "CREATE DATABASE zenith_test;"

# Run migrations in timestamp order
for migration in $(ls -v src/migrations/*.ts | grep -v "base/" | sort -n); do
  echo "Running migration: $migration"
  NODE_ENV=test npm run typeorm -- migration:run -d src/config/typeorm.config.ts --transaction each
done 