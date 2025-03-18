import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NlpModelPerformance } from '../entities/model-performance.entity';
import { ModelConfig, NLP_MODELS } from '../config/ab-testing.config';

@Injectable()
export class AbTestingService {
  private readonly logger = new Logger(AbTestingService.name);
  private modelConfigs: ModelConfig[] = [];
  private totalTrafficPercentage = 0;

  constructor(
    @InjectRepository(NlpModelPerformance)
    private readonly modelPerformanceRepository: Repository<NlpModelPerformance>,
  ) {
    this.initializeModels();
  }

  /**
   * Initialize models for A/B testing
   */
  private initializeModels(): void {
    // Filter out inactive models and calculate total traffic percentage
    this.modelConfigs = NLP_MODELS.filter((model) => model.isActive);
    this.totalTrafficPercentage = this.modelConfigs.reduce(
      (sum, model) => sum + model.trafficPercentage,
      0,
    );

    // Validate total percentage
    if (this.modelConfigs.length > 0 && this.totalTrafficPercentage !== 100) {
      this.logger.warn(
        `A/B testing model traffic percentages sum to ${this.totalTrafficPercentage}%, not 100%. Traffic distribution may be skewed.`,
      );
    }

    this.logger.log(
      `Initialized ${this.modelConfigs.length} NLP models for A/B testing`,
    );
  }

  /**
   * Select a model for the current request based on traffic distribution
   */
  public selectModel(userId?: string): ModelConfig {
    // If no models are configured, return a default configuration
    if (this.modelConfigs.length === 0) {
      return {
        modelId: 'default',
        modelVersion: '1.0.0',
        description: 'Default NLP model',
        trafficPercentage: 100,
        isActive: true,
      };
    }

    // If only one model is configured, return it
    if (this.modelConfigs.length === 1) {
      return this.modelConfigs[0];
    }

    // For consistent experience, use userId hash to determine model if available
    if (userId) {
      // Simple hash function to convert userId to a number between 0-99
      const userHash = this.hashUserId(userId) % 100;

      // Find the appropriate model for this user based on traffic distribution
      let cumulativePercentage = 0;
      for (const model of this.modelConfigs) {
        cumulativePercentage += model.trafficPercentage;
        if (userHash < cumulativePercentage) {
          return model;
        }
      }
    }

    // If no userId or hash didn't match (unlikely), use random selection
    const randomValue = Math.random() * 100;
    let cumulativePercentage = 0;

    for (const model of this.modelConfigs) {
      cumulativePercentage += model.trafficPercentage;
      if (randomValue < cumulativePercentage) {
        return model;
      }
    }

    // Fallback to the first model if something goes wrong
    return this.modelConfigs[0];
  }

  /**
   * Record model performance for analytics and comparison
   */
  public async recordModelPerformance(
    performance: Partial<NlpModelPerformance>,
  ): Promise<void> {
    try {
      const modelPerformance =
        this.modelPerformanceRepository.create(performance);
      await this.modelPerformanceRepository.save(modelPerformance);
    } catch (error) {
      this.logger.error(
        `Error recording model performance: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update user feedback for a previous model usage
   */
  public async updateUserFeedback(
    requestId: string,
    wasHelpful: boolean,
  ): Promise<void> {
    try {
      await this.modelPerformanceRepository.update(
        { requestId },
        { userRatedHelpful: wasHelpful },
      );
    } catch (error) {
      this.logger.error(
        `Error updating user feedback: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get performance metrics for models to compare effectiveness
   */
  public async getModelPerformanceMetrics(
    days = 7,
    operationType?: string,
  ): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const queryBuilder = this.modelPerformanceRepository
        .createQueryBuilder('performance')
        .select('performance.modelId', 'modelId')
        .addSelect('performance.modelVersion', 'modelVersion')
        .addSelect('COUNT(*)', 'requestCount')
        .addSelect('AVG(performance.confidenceScore)', 'avgConfidence')
        .addSelect('AVG(performance.processingTimeMs)', 'avgProcessingTime')
        .addSelect(
          'SUM(CASE WHEN performance.userRatedHelpful = true THEN 1 ELSE 0 END)',
          'helpfulCount',
        )
        .addSelect(
          'SUM(CASE WHEN performance.userRatedHelpful = false THEN 1 ELSE 0 END)',
          'unhelpfulCount',
        )
        .addSelect(
          'SUM(CASE WHEN performance.requiredClarification = true THEN 1 ELSE 0 END)',
          'clarificationCount',
        )
        .where('performance.createdAt >= :startDate', { startDate })
        .groupBy('performance.modelId')
        .addGroupBy('performance.modelVersion');

      if (operationType) {
        queryBuilder.andWhere('performance.operationType = :operationType', {
          operationType,
        });
      }

      return await queryBuilder.getRawMany();
    } catch (error) {
      this.logger.error(
        `Error getting model performance metrics: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Simple hash function for consistent user-model mapping
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
