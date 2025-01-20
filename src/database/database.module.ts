import { Module } from '@nestjs/common';
import { databaseProviders } from './database.providers';
import { DatabaseTestService } from './database-test.service';

@Module({
  providers: [...databaseProviders, DatabaseTestService],
  exports: [...databaseProviders, DatabaseTestService],
})
export class DatabaseModule {} 