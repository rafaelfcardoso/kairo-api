/**
 * Configuration for NLP A/B Testing Framework
 */

export interface ModelConfig {
  modelId: string;
  modelVersion: string;
  description: string;
  trafficPercentage: number;
  isActive: boolean;
  parameters?: Record<string, any>;
}

/**
 * Available NLP models for A/B testing
 * Traffic percentages must add up to 100 for active models
 */
export const NLP_MODELS: ModelConfig[] = [
  {
    modelId: 'default',
    modelVersion: '1.0.0',
    description: 'Default NLP model',
    trafficPercentage: 80,
    isActive: true,
  },
  {
    modelId: 'experimental',
    modelVersion: '1.1.0-beta',
    description: 'Experimental model with improved entity extraction',
    trafficPercentage: 20,
    isActive: true,
    parameters: {
      confidenceThreshold: 0.55, // Lower threshold for the experimental model
    },
  },
];

/**
 * Configuration for A/B testing metrics collection
 */
export const METRICS_CONFIG = {
  collectDetailedMetrics: true,
  metricsRetentionDays: 30,
};
