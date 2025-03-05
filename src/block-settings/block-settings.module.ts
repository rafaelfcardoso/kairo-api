import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockSettingsController } from './block-settings.controller';
import { BlockSettingsService } from './block-settings.service';
import { BlockSetting } from './entities/block-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlockSetting])],
  controllers: [BlockSettingsController],
  providers: [BlockSettingsService],
  exports: [BlockSettingsService],
})
export class BlockSettingsModule {}
