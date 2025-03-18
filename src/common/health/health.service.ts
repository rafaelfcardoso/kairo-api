import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { HealthIndicatorResult } from '@nestjs/terminus';
import * as os from 'os';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { SystemHealth } from '../../entities/system-health.entity';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private readonly processId = process.pid;
  private readonly hostname = os.hostname();
  private serviceDisruptions = 0;
  private recoveryAttempts = 0;
  private successfulRecoveries = 0;
  private lastRecoveryAttempt: Date | null = null;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private httpService: HttpService,
  ) {
    // Set up periodic health checks
    setInterval(() => this.runPeriodicHealthCheck(), 60000); // Check every minute

    // Set up periodic health metric logging (every 15 minutes)
    setInterval(() => this.logHealthMetrics(), 15 * 60 * 1000);
  }

  /**
   * Check all services and return health indicators
   */
  async checkServices(): Promise<HealthIndicatorResult> {
    const result: HealthIndicatorResult = {};

    try {
      // Check if we can execute a simple query
      const dbStatus = await this.checkDatabaseConnectivity();
      result.services = {
        status: dbStatus ? 'up' : 'down',
        details: {
          database: dbStatus ? 'connected' : 'disconnected',
          disruptions: this.serviceDisruptions,
          recoveryAttempts: this.recoveryAttempts,
          successfulRecoveries: this.successfulRecoveries,
          lastRecovery: this.lastRecoveryAttempt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Service health check failed: ${error.message}`,
        error.stack,
      );
      result.services = {
        status: 'down',
        error: error.message,
      };
    }

    return result;
  }

  /**
   * Get detailed health information about the system and application
   */
  async getDetailedHealthInfo() {
    const baseUrl =
      this.configService.get('api.url') || 'http://localhost:3001';
    const dbStatus = this.dataSource.isInitialized
      ? 'connected'
      : 'disconnected';
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Get system information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuUsage = os.loadavg()[0];
    const nodeVersion = process.version;

    // Get database information
    let dbMetrics = {};
    try {
      if (this.dataSource.isInitialized) {
        const queryRunner = this.dataSource.createQueryRunner();

        // Get database size
        const dbSizeResult = await queryRunner.query(
          'SELECT pg_size_pretty(pg_database_size(current_database())) as size',
        );

        // Get connection count
        const connectionCountResult = await queryRunner.query(
          'SELECT count(*) as count FROM pg_stat_activity',
        );

        // Get transaction count
        const txCountResult = await queryRunner.query(
          'SELECT sum(xact_commit + xact_rollback) as transactions FROM pg_stat_database WHERE datname = current_database()',
        );

        await queryRunner.release();

        dbMetrics = {
          size: dbSizeResult[0]?.size || 'unknown',
          connections: parseInt(connectionCountResult[0]?.count || '0'),
          transactions: parseInt(txCountResult[0]?.transactions || '0'),
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to get database metrics: ${error.message}`,
        error.stack,
      );
      dbMetrics = { error: error.message };
    }

    // Return detailed status
    return {
      name: 'Zenith API',
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('nodeEnv') || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: uptime,
      uptime_human: this.formatUptime(uptime),
      process: {
        id: this.processId,
        node_version: nodeVersion,
        memory_usage: process.memoryUsage(),
      },
      system: {
        hostname: this.hostname,
        platform: process.platform,
        architecture: process.arch,
        cpus: os.cpus().length,
        load_average: os.loadavg(),
        memory: {
          total: totalMem,
          free: freeMem,
          used_percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
        },
      },
      database: {
        status: dbStatus,
        type: 'postgres',
        ...dbMetrics,
      },
      service_metrics: {
        disruptions: this.serviceDisruptions,
        recovery_attempts: this.recoveryAttempts,
        successful_recoveries: this.successfulRecoveries,
        last_recovery_attempt: this.lastRecoveryAttempt,
      },
      links: {
        documentation: `${baseUrl}/api`,
        health_check: `${baseUrl}/api/v1/system-health`,
        detailed_health: `${baseUrl}/api/v1/system-health/detailed`,
        database_health: `${baseUrl}/api/v1/system-health/db`,
        memory_health: `${baseUrl}/api/v1/system-health/memory`,
        disk_health: `${baseUrl}/api/v1/system-health/disk`,
      },
    };
  }

  /**
   * Attempts to recover from database connectivity issues
   */
  private async recoverDatabaseConnection(): Promise<boolean> {
    this.logger.warn('Attempting to recover database connection');
    this.lastRecoveryAttempt = new Date();
    this.recoveryAttempts++;

    try {
      // If datasource is not initialized, try to initialize it
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.logger.log('Database connection successfully re-initialized');
        this.successfulRecoveries++;
        return true;
      }

      // If it's initialized but not working, destroy and re-initialize
      await this.dataSource.destroy();
      await this.dataSource.initialize();
      this.logger.log('Database connection successfully reconnected');
      this.successfulRecoveries++;
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to recover database connection: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Runs a periodic health check and attempts recovery if needed
   */
  private async runPeriodicHealthCheck() {
    try {
      const dbConnected = await this.checkDatabaseConnectivity();

      if (!dbConnected) {
        this.serviceDisruptions++;
        this.logger.warn(
          `Service disruption detected. Total disruptions: ${this.serviceDisruptions}`,
        );

        // Attempt recovery
        const recovered = await this.recoverDatabaseConnection();
        if (recovered) {
          this.logger.log('Service recovery successful');
        } else {
          this.logger.error('Service recovery failed');
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in periodic health check: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log health metrics to the database
   */
  private async logHealthMetrics() {
    if (!this.dataSource.isInitialized) {
      this.logger.warn('Cannot log health metrics: Database not initialized');
      return;
    }

    try {
      const systemHealth = new SystemHealth();

      // Calculate memory in MB
      const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
      const usedMemMb = Math.round(
        (os.totalmem() - os.freemem()) / (1024 * 1024),
      );
      const memoryPercent = (usedMemMb / totalMemMb) * 100;

      // Set basic metrics
      systemHealth.status = 'ok';
      systemHealth.system_load = os.loadavg()[0];
      systemHealth.memory_used_mb = usedMemMb;
      systemHealth.memory_total_mb = totalMemMb;
      systemHealth.memory_used_percent = memoryPercent;
      systemHealth.database_connected = this.dataSource.isInitialized;
      systemHealth.uptime_seconds = Math.floor(
        (Date.now() - this.startTime) / 1000,
      );
      systemHealth.service_disruptions = this.serviceDisruptions;
      systemHealth.recovery_attempts = this.recoveryAttempts;
      systemHealth.successful_recoveries = this.successfulRecoveries;

      // Try to get database metrics
      try {
        if (this.dataSource.isInitialized) {
          const queryRunner = this.dataSource.createQueryRunner();

          // Get database size in MB
          const dbSizeResult = await queryRunner.query(
            'SELECT pg_database_size(current_database()) / (1024*1024) as size_mb',
          );

          // Get connection count
          const connectionCountResult = await queryRunner.query(
            'SELECT count(*) as count FROM pg_stat_activity',
          );

          await queryRunner.release();

          systemHealth.database_size_mb =
            parseFloat(dbSizeResult[0]?.size_mb) || null;
          systemHealth.database_connections = parseInt(
            connectionCountResult[0]?.count || '0',
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to get database metrics for logging: ${error.message}`,
          error.stack,
        );
      }

      // Additional information - store as JSON
      systemHealth.additional_info = {
        nodeVersion: process.version,
        hostname: this.hostname,
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
      };

      // Save to database
      await this.dataSource.getRepository(SystemHealth).save(systemHealth);
      this.logger.log('Health metrics logged to database');
    } catch (error) {
      this.logger.error(
        `Failed to log health metrics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if the database connection is functional
   */
  private async checkDatabaseConnectivity(): Promise<boolean> {
    if (!this.dataSource.isInitialized) {
      return false;
    }

    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.query('SELECT 1');
      await queryRunner.release();
      return true;
    } catch (error) {
      this.logger.error(
        `Database connectivity check failed: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Format uptime in a human-readable format
   */
  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
