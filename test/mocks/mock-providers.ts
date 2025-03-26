import { Provider } from '@nestjs/common';
import { MockAiService } from './mock-ai.service';
import { AiService } from '../../src/common/services/ai.service';

/**
 * Provider to substitute the real AiService with MockAiService
 */
export const MockAiServiceProvider: Provider = {
  provide: AiService,
  useClass: MockAiService,
};

/**
 * Collection of all mock providers for easy test module configuration
 */
export const AllMockProviders: Provider[] = [MockAiServiceProvider];
