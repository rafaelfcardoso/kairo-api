import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { SchedulesService } from './schedules.service';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedules for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of schedules',
    type: [Schedule],
  })
  findAll(@GetUser() user: User): Promise<Schedule[]> {
    return this.schedulesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific schedule by ID' })
  @ApiParam({ name: 'id', description: 'Schedule ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The schedule',
    type: Schedule,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.schedulesService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new schedule' })
  @ApiResponse({
    status: 201,
    description: 'The schedule has been created',
    type: Schedule,
  })
  create(
    @Body() createScheduleDto: CreateScheduleDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.schedulesService.create(createScheduleDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The schedule has been updated',
    type: Schedule,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.schedulesService.update(id, updateScheduleDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The schedule has been deleted',
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.schedulesService.remove(id, user.id);
  }
}
