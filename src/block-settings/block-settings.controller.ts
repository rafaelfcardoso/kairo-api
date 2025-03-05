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
import { BlockSettingsService } from './block-settings.service';
import { BlockSetting } from './entities/block-setting.entity';
import { CreateBlockSettingDto } from './dto/create-block-setting.dto';
import { UpdateBlockSettingDto } from './dto/update-block-setting.dto';

@ApiTags('Block Settings')
@Controller('block-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockSettingsController {
  constructor(private readonly blockSettingsService: BlockSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all block settings for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of block settings',
    type: [BlockSetting],
  })
  findAll(@GetUser() user: User): Promise<BlockSetting[]> {
    return this.blockSettingsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific block setting by ID' })
  @ApiParam({ name: 'id', description: 'Block setting ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The block setting',
    type: BlockSetting,
  })
  @ApiResponse({ status: 404, description: 'Block setting not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<BlockSetting> {
    return this.blockSettingsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new block setting' })
  @ApiResponse({
    status: 201,
    description: 'The block setting has been created',
    type: BlockSetting,
  })
  create(
    @Body() createBlockSettingDto: CreateBlockSettingDto,
    @GetUser() user: User,
  ): Promise<BlockSetting> {
    return this.blockSettingsService.create(createBlockSettingDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a block setting' })
  @ApiParam({ name: 'id', description: 'Block setting ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The block setting has been updated',
    type: BlockSetting,
  })
  @ApiResponse({ status: 404, description: 'Block setting not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBlockSettingDto: UpdateBlockSettingDto,
    @GetUser() user: User,
  ): Promise<BlockSetting> {
    return this.blockSettingsService.update(id, updateBlockSettingDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a block setting' })
  @ApiParam({ name: 'id', description: 'Block setting ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The block setting has been deleted',
  })
  @ApiResponse({ status: 404, description: 'Block setting not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.blockSettingsService.remove(id, user.id);
  }
}
