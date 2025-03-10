import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockSettingsController } from './block-settings.controller';
import { BlockSettingsService } from './block-settings.service';
import { BlockSetting } from './entities/block-setting.entity';
import { BlockList } from './entities/block-list.entity';
import { BlockItem } from './entities/block-item.entity';
import { AppCategory } from './entities/app-category.entity';
import { BlockListsController } from './controllers/block-lists.controller';
import { BlockItemsController } from './controllers/block-items.controller';
import { AppCategoriesController } from './controllers/app-categories.controller';
import { BlockListsService } from './services/block-lists.service';
import { BlockItemsService } from './services/block-items.service';
import { AppCategoriesService } from './services/app-categories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockSetting, BlockList, BlockItem, AppCategory]),
  ],
  controllers: [
    BlockSettingsController,
    BlockListsController,
    BlockItemsController,
    AppCategoriesController,
  ],
  providers: [
    BlockSettingsService,
    BlockListsService,
    BlockItemsService,
    AppCategoriesService,
  ],
  exports: [
    BlockSettingsService,
    BlockListsService,
    BlockItemsService,
    AppCategoriesService,
  ],
})
export class BlockSettingsModule {}
