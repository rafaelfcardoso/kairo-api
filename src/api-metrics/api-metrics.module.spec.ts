import { Test } from '@nestjs/testing';
import { ApiMetricsModule } from './api-metrics.module';
import { ApiMetricsService } from './api-metrics.service';
import { ApiMetricsController } from './api-metrics.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';

describe('ApiMetricsModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [ApiMetricsModule],
    })
      .overrideProvider(getRepositoryToken(ApiRequestLog))
      .useValue({})
      .overrideProvider(getRepositoryToken(ApiMetrics))
      .useValue({})
      .compile();

    expect(module).toBeDefined();
    expect(module.get(ApiMetricsService)).toBeInstanceOf(ApiMetricsService);
    expect(module.get(ApiMetricsController)).toBeInstanceOf(
      ApiMetricsController,
    );
  });
});
