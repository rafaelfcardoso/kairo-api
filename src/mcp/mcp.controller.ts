import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  Req,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { McpService } from './mcp.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ResourceQueryParams,
  ActionExecutionRequest,
  ResourceInstance,
  ApiResponse,
  CollectionResponse,
  ApiErrorCode,
} from './mcp.types';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse as SwaggerApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ResponseUtil } from './utils/response.util';
import { ApiVersionInterceptor } from './interceptors/api-version.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import {
  ResourceResponseExample,
  CollectionResponseExample,
  ErrorResponseExample,
  SchemaResponseExample,
} from './docs/response-examples';

@ApiTags('MCP')
@Controller('mcp')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(ApiVersionInterceptor)
@UseFilters(HttpExceptionFilter)
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private mcpService: McpService) {}

  @Get('resources/:type/schema')
  @ApiOperation({ summary: 'Get resource schema' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Resource schema retrieved successfully',
    schema: { example: SchemaResponseExample },
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Resource type not found',
    schema: { example: ErrorResponseExample },
  })
  async getResourceSchema(
    @Param('type') resourceType: string,
    @Req() request: Request,
  ): Promise<ApiResponse<any>> {
    try {
      const schema = await this.mcpService.getResourceSchema(resourceType);
      return ResponseUtil.createResourceResponse(schema, request);
    } catch (error) {
      this.logger.error(
        `Error retrieving schema for resource type ${resourceType}: ${error.message}`,
      );
      if (error.message.includes('Unknown resource type')) {
        throw new NotFoundException(`Resource type ${resourceType} not found`);
      }
      throw new InternalServerErrorException(
        'Failed to retrieve resource schema',
      );
    }
  }

  @Get('resources/:type')
  @ApiOperation({ summary: 'Get resources' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @ApiQuery({
    name: 'filter',
    required: false,
    description: 'Filter parameters',
  })
  @ApiQuery({
    name: 'include',
    required: false,
    description: 'Related resources to include',
  })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort parameters' })
  @ApiQuery({
    name: 'page[number]',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'page[size]',
    required: false,
    description: 'Page size for pagination',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Resources retrieved successfully',
    schema: { example: CollectionResponseExample },
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Resource type not found',
    schema: { example: ErrorResponseExample },
  })
  async getResources(
    @Param('type') resourceType: string,
    @Query() queryParams: any,
    @Req() request: Request,
  ): Promise<CollectionResponse<ResourceInstance>> {
    try {
      // Transform query parameters to ResourceQueryParams
      const params: ResourceQueryParams = {
        filter: {},
        include: [],
        sort: [],
        page: {},
      };

      // Parse filter parameters (format: filter[field]=value)
      Object.keys(queryParams).forEach((key) => {
        const filterMatch = key.match(/^filter\[([^\]]+)\]$/);
        if (filterMatch) {
          const field = filterMatch[1];
          params.filter[field] = queryParams[key];
        }
      });

      // Parse include parameter (format: include=relation1,relation2)
      if (queryParams.include) {
        params.include = queryParams.include.split(',');
      }

      // Parse sort parameter (format: sort=field1,-field2)
      if (queryParams.sort) {
        params.sort = queryParams.sort.split(',');
      }

      // Parse pagination parameters (format: page[number]=1&page[size]=10)
      Object.keys(queryParams).forEach((key) => {
        const pageMatch = key.match(/^page\[([^\]]+)\]$/);
        if (pageMatch) {
          const paramName = pageMatch[1];
          params.page[paramName] = parseInt(queryParams[key], 10);
        }
      });

      // Get resources with the provided parameters
      const result = await this.mcpService.getResources(resourceType, params);
      const totalCount = await this.mcpService.getResourceCount(
        resourceType,
        params.filter,
      );

      return ResponseUtil.createCollectionResponse(
        result.resources,
        request,
        params,
        totalCount,
        result.included,
      );
    } catch (error) {
      this.logger.error(
        `Error retrieving resources of type ${resourceType}: ${error.message}`,
      );
      if (error.message.includes('Unknown resource type')) {
        throw new NotFoundException(`Resource type ${resourceType} not found`);
      }
      throw new InternalServerErrorException('Failed to retrieve resources');
    }
  }

  @Get('resources/:type/:id')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiQuery({
    name: 'include',
    required: false,
    description: 'Related resources to include',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Resource retrieved successfully',
    schema: { example: ResourceResponseExample },
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Resource not found',
    schema: { example: ErrorResponseExample },
  })
  async getResource(
    @Param('type') resourceType: string,
    @Param('id') id: string,
    @Req() request: Request,
    @Query('include') include?: string,
  ): Promise<ApiResponse<ResourceInstance>> {
    try {
      const includeRelations = include ? include.split(',') : [];
      const result = await this.mcpService.getResource(
        resourceType,
        id,
        includeRelations,
      );

      return ResponseUtil.createResourceResponse(
        result.resource,
        request,
        result.included,
      );
    } catch (error) {
      this.logger.error(
        `Error retrieving resource ${id} of type ${resourceType}: ${error.message}`,
      );
      if (error.message.includes('Resource not found')) {
        throw new NotFoundException(
          `Resource of type ${resourceType} with ID ${id} not found`,
        );
      }
      throw new InternalServerErrorException('Failed to retrieve resource');
    }
  }

  @Post('resources/:type')
  @ApiOperation({ summary: 'Create resource' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @ApiBody({ description: 'Resource data' })
  @SwaggerApiResponse({
    status: 201,
    description: 'Resource created successfully',
    schema: { example: ResourceResponseExample },
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid resource data',
    schema: { example: ErrorResponseExample },
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Resource type not found',
    schema: { example: ErrorResponseExample },
  })
  async createResource(
    @Param('type') resourceType: string,
    @Body() resourceData: any,
    @Req() request: Request,
  ): Promise<ApiResponse<ResourceInstance>> {
    try {
      const result = await this.mcpService.createResource(
        resourceType,
        resourceData,
      );

      return ResponseUtil.createResourceResponse(
        result.resource,
        request,
        result.included,
      );
    } catch (error) {
      this.logger.error(
        `Error creating resource of type ${resourceType}: ${error.message}`,
      );
      if (error.message.includes('Unknown resource type')) {
        throw new NotFoundException(`Resource type ${resourceType} not found`);
      }
      if (error.message.includes('Invalid data')) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create resource');
    }
  }

  @Get('tools')
  @ApiOperation({ summary: 'Get available tools/actions' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Tools retrieved successfully',
    schema: { example: CollectionResponseExample },
  })
  async getTools(@Req() request: Request): Promise<CollectionResponse<any>> {
    try {
      const tools = await this.mcpService.getAvailableTools();
      return ResponseUtil.createCollectionResponse(
        tools,
        request,
        { filter: {}, include: [], sort: [], page: {} },
        tools.length,
      );
    } catch (error) {
      this.logger.error(`Error retrieving tools: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve tools');
    }
  }

  @Post('actions')
  @ApiOperation({ summary: 'Execute action' })
  @ApiBody({ description: 'Action execution request' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Action executed successfully',
    schema: { example: ResourceResponseExample },
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid action parameters',
    schema: { example: ErrorResponseExample },
  })
  async executeAction(
    @Body() request: ActionExecutionRequest,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.mcpService.executeAction(request);
      return ResponseUtil.createResourceResponse(result, req);
    } catch (error) {
      this.logger.error(`Error executing action: ${error.message}`);
      if (error.message.includes('Invalid parameters')) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to execute action');
    }
  }
}
