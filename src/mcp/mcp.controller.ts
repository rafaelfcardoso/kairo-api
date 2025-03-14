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
} from '@nestjs/common';
import { McpService } from './mcp.service';
import { AuthGuard } from '@nestjs/passport';
import { ResourceQueryParams, ActionExecutionRequest } from './mcp.types';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('MCP')
@Controller('mcp')
@UseGuards(AuthGuard('jwt'))
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private mcpService: McpService) {}

  @Get('resources/:type/schema')
  @ApiOperation({ summary: 'Get resource schema' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @ApiResponse({
    status: 200,
    description: 'Resource schema retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Resource type not found' })
  getResourceSchema(@Param('type') resourceType: string) {
    try {
      return this.mcpService.getResourceSchema(resourceType);
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
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource type not found' })
  async getResources(
    @Param('type') resourceType: string,
    @Query() queryParams: any,
  ) {
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

      // Parse pagination parameters
      if (queryParams.page) {
        const pageNumber = parseInt(queryParams['page[number]']);
        const pageSize = parseInt(queryParams['page[size]']);

        if (!isNaN(pageNumber)) params.page.number = pageNumber;
        if (!isNaN(pageSize)) params.page.size = pageSize;
      }

      return this.mcpService.getResources(resourceType, params);
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
  @ApiOperation({ summary: 'Get a specific resource by ID' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({
    status: 400,
    description: 'Resource does not meet required criteria',
  })
  async getResource(
    @Param('type') resourceType: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.mcpService.getResource(resourceType, id);
    } catch (error) {
      this.logger.error(
        `Error retrieving resource of type ${resourceType} with ID ${id}: ${error.message}`,
      );
      if (error.message.includes('Unknown resource type')) {
        throw new NotFoundException(`Resource type ${resourceType} not found`);
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message.includes('does not meet required criteria')) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to retrieve resource');
    }
  }

  @Post('resources/:type')
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiParam({ name: 'type', description: 'Resource type (e.g., task)' })
  @ApiBody({ description: 'Resource data' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid resource data' })
  @ApiResponse({ status: 404, description: 'Resource type not found' })
  async createResource(
    @Param('type') resourceType: string,
    @Body() resourceData: any,
  ) {
    try {
      return await this.mcpService.createResource(resourceType, resourceData);
    } catch (error) {
      this.logger.error(
        `Error creating resource of type ${resourceType}: ${error.message}`,
      );
      if (error.message.includes('Unknown resource type')) {
        throw new NotFoundException(`Resource type ${resourceType} not found`);
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create resource: ${error.message}`,
      );
    }
  }

  @Get('tools')
  @ApiOperation({ summary: 'Get available MCP tools/actions' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
  async getTools() {
    try {
      return this.mcpService.getTools();
    } catch (error) {
      this.logger.error(`Error retrieving MCP tools: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve MCP tools');
    }
  }

  @Post('actions')
  @ApiOperation({ summary: 'Execute an MCP action' })
  @ApiBody({ description: 'Action execution request' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action request' })
  async executeAction(@Body() request: ActionExecutionRequest) {
    try {
      return await this.mcpService.executeAction(request);
    } catch (error) {
      this.logger.error(
        `Error executing action ${request.name}: ${error.message}`,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to execute action: ${error.message}`,
      );
    }
  }
}
