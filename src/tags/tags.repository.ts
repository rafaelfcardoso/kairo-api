import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tag } from './tags.entity';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class TagRepository extends Repository<Tag> {
  constructor(private dataSource: DataSource) {
    super(Tag, dataSource.createEntityManager());
  }

  async getTags(): Promise<Tag[]> {
    return this.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.tasks', 'tasks')
      .orderBy('tag.name', 'ASC')
      .getMany();
  }

  async getTagById(id: string): Promise<Tag> {
    const tag = await this.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID "${id}" not found`);
    }

    return tag;
  }

  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    const tag = this.create(createTagDto);
    await this.save(tag);
    return this.getTagById(tag.id);
  }

  async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.getTagById(id);
    Object.assign(tag, updateTagDto);
    await this.save(tag);
    return this.getTagById(id);
  }

  async deleteTag(id: string): Promise<void> {
    const result = await this.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Tag with ID "${id}" not found`);
    }
  }

  async getTagsByIds(ids: string[]): Promise<Tag[]> {
    const tags = await this.findBy({ id: { $in: ids } as any });
    if (tags.length !== ids.length) {
      throw new NotFoundException('One or more tags not found');
    }
    return tags;
  }

  async getTagStats(): Promise<Array<{ tag: Tag; taskCount: number }>> {
    const tags = await this.createQueryBuilder('tag')
      .loadRelationCountAndMap('tag.taskCount', 'tag.tasks')
      .getMany();

    return tags.map(tag => ({
      tag,
      taskCount: (tag as any).taskCount || 0,
    }));
  }

  async findSimilarTags(name: string): Promise<Tag[]> {
    return this.createQueryBuilder('tag')
      .where('LOWER(tag.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .getMany();
  }
} 