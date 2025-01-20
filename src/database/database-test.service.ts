import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseTestService {
  private readonly logger = new Logger(DatabaseTestService.name);

  constructor(private dataSource: DataSource) {}

  async testConnection() {
    try {
      if (this.dataSource.isInitialized) {
        this.logger.log('Database connection is working!');
        this.logger.log(`Connected to: ${this.dataSource.options.database}`);
      } else {
        this.logger.error('Database connection failed!');
      }
    } catch (error) {
      this.logger.error('Database connection error:', error);
    }
  }
}
