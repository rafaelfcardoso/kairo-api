import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Logger,
  HttpStatus,
  ParseIntPipe,
  ParseEnumPipe,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AbTestingService } from '../services/ab-testing.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

enum OperationType {
  TASK_PARSING = 'task_parsing',
  ENTITY_EXTRACTION = 'entity_extraction',
  QUERY_UNDERSTANDING = 'query_understanding',
  INTENT_CLASSIFICATION = 'intent_classification',
}

@ApiTags('A/B Testing')
@Controller('nlp/ab-testing')
export class AbTestingController {
  private readonly logger = new Logger(AbTestingController.name);

  constructor(private readonly abTestingService: AbTestingService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'View A/B testing dashboard',
    description: 'Displays a dashboard for visualizing A/B testing metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard HTML',
  })
  async getDashboard(@Res() res: Response) {
    try {
      const dashboardPath = path.join(
        process.cwd(),
        'src/nlp/views/ab-testing-dashboard.html',
      );

      // Check if the file exists
      if (fs.existsSync(dashboardPath)) {
        return res.sendFile(dashboardPath);
      } else {
        this.logger.error(`Dashboard file not found at ${dashboardPath}`);
        return res.status(404).send('Dashboard file not found');
      }
    } catch (error) {
      this.logger.error(
        `Error serving dashboard: ${error.message}`,
        error.stack,
      );
      return res.status(500).send('Error serving dashboard');
    }
  }

  @Get('metrics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get model performance metrics',
    description:
      'Retrieves performance metrics for NLP models to compare A/B test results',
  })
  @ApiQuery({
    name: 'days',
    description: 'Number of days to include in the metrics',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'operationType',
    description: 'Filter by operation type',
    required: false,
    enum: OperationType,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model performance metrics retrieved successfully',
  })
  async getModelMetrics(
    @Query('days', new ParseIntPipe({ optional: true })) days = 7,
    @Query(
      'operationType',
      new ParseEnumPipe(OperationType, { optional: true }),
    )
    operationType?: OperationType,
  ) {
    return this.abTestingService.getModelPerformanceMetrics(
      days,
      operationType,
    );
  }

  @Post('feedback/:requestId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit user feedback for a model prediction',
    description: 'Records whether a model prediction was helpful or not',
  })
  @ApiParam({
    name: 'requestId',
    description: 'The request ID to provide feedback for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback recorded successfully',
  })
  async submitFeedback(
    @Param('requestId') requestId: string,
    @Body() feedback: { wasHelpful: boolean },
  ) {
    await this.abTestingService.updateUserFeedback(
      requestId,
      feedback.wasHelpful,
    );
    return { success: true };
  }
}
