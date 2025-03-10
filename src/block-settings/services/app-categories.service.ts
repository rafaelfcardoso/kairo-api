import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppCategory } from '../entities/app-category.entity';
import { CreateAppCategoryDto } from '../dto/create-app-category.dto';
import { UpdateAppCategoryDto } from '../dto/update-app-category.dto';

@Injectable()
export class AppCategoriesService {
  constructor(
    @InjectRepository(AppCategory)
    private appCategoryRepository: Repository<AppCategory>,
  ) {}

  async findAll(): Promise<AppCategory[]> {
    return this.appCategoryRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<AppCategory> {
    const category = await this.appCategoryRepository.findOne({
      where: { id },
      relations: ['blockItems'],
    });

    if (!category) {
      throw new NotFoundException(`App category with ID ${id} not found`);
    }

    return category;
  }

  async findBySystemId(systemId: string): Promise<AppCategory | null> {
    return this.appCategoryRepository.findOne({
      where: { systemId },
    });
  }

  async create(
    createAppCategoryDto: CreateAppCategoryDto,
  ): Promise<AppCategory> {
    // Check if category with systemId already exists
    const existingCategory = await this.findBySystemId(
      createAppCategoryDto.systemId,
    );

    if (existingCategory) {
      throw new ConflictException(
        `App category with systemId ${createAppCategoryDto.systemId} already exists`,
      );
    }

    // Create the app category
    const category = this.appCategoryRepository.create(createAppCategoryDto);

    // Save the app category
    return this.appCategoryRepository.save(category);
  }

  async update(
    id: string,
    updateAppCategoryDto: UpdateAppCategoryDto,
  ): Promise<AppCategory> {
    const category = await this.findOne(id);

    // If updating systemId, check if it would conflict
    if (
      updateAppCategoryDto.systemId !== undefined &&
      updateAppCategoryDto.systemId !== category.systemId
    ) {
      const existingCategory = await this.findBySystemId(
        updateAppCategoryDto.systemId,
      );

      if (existingCategory) {
        throw new ConflictException(
          `App category with systemId ${updateAppCategoryDto.systemId} already exists`,
        );
      }
    }

    // Update fields
    if (updateAppCategoryDto.systemId !== undefined) {
      category.systemId = updateAppCategoryDto.systemId;
    }

    if (updateAppCategoryDto.name !== undefined) {
      category.name = updateAppCategoryDto.name;
    }

    if (updateAppCategoryDto.description !== undefined) {
      category.description = updateAppCategoryDto.description;
    }

    if (updateAppCategoryDto.isActive !== undefined) {
      category.isActive = updateAppCategoryDto.isActive;
    }

    // Save the changes
    return this.appCategoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has any block items
    if (category.blockItems && category.blockItems.length > 0) {
      throw new ConflictException(
        `Cannot delete category with ID ${id} because it has associated block items`,
      );
    }

    // Remove the category
    await this.appCategoryRepository.remove(category);
  }

  // Method to seed default categories for iOS
  async seedDefaultCategories(): Promise<AppCategory[]> {
    const defaultCategories = [
      {
        systemId: 'SOCIAL_NETWORKING',
        name: 'Social Networking',
        description: 'Apps for social media and communication',
      },
      {
        systemId: 'GAMES',
        name: 'Games',
        description: 'Entertainment apps and games',
      },
      {
        systemId: 'PRODUCTIVITY',
        name: 'Productivity',
        description: 'Apps for work and productivity',
      },
      {
        systemId: 'ENTERTAINMENT',
        name: 'Entertainment',
        description: 'Streaming apps and media consumption',
      },
      {
        systemId: 'SHOPPING',
        name: 'Shopping',
        description: 'E-commerce and shopping apps',
      },
      {
        systemId: 'TRAVEL',
        name: 'Travel',
        description: 'Travel and navigation apps',
      },
      {
        systemId: 'HEALTH_FITNESS',
        name: 'Health & Fitness',
        description: 'Apps for health tracking and fitness',
      },
      {
        systemId: 'FINANCE',
        name: 'Finance',
        description: 'Banking and financial apps',
      },
      {
        systemId: 'NEWS',
        name: 'News',
        description: 'News and information apps',
      },
    ];

    const categories: AppCategory[] = [];

    for (const category of defaultCategories) {
      // Skip if category already exists
      const existingCategory = await this.findBySystemId(category.systemId);

      if (!existingCategory) {
        const newCategory = this.appCategoryRepository.create(category);
        categories.push(await this.appCategoryRepository.save(newCategory));
      } else {
        categories.push(existingCategory);
      }
    }

    return categories;
  }
}
