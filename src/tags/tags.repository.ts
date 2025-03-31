import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, ILike, In, FindOptionsWhere } from 'typeorm';
import { Tag } from './tags.entity';
import { CreateTagDto, UpdateTagDto } from './tags.dto';

@Injectable()
export class TagsRepository {
  protected repository: Repository<Tag>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Tag);
  }

  async getTags(): Promise<Tag[]> {
    return this.repository.find({
      relations: ['tasks'],
      order: { name: 'ASC' },
    });
  }

  async getTagById(id: string): Promise<Tag> {
    const tag = await this.repository.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID "${id}" not found`);
    }

    return tag;
  }

  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    const tag = this.repository.create(createTagDto);
    await this.repository.save(tag);
    return this.getTagById(tag.id);
  }

  async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.getTagById(id);
    Object.assign(tag, updateTagDto);
    await this.repository.save(tag);
    return this.getTagById(id);
  }

  async deleteTag(id: string): Promise<void> {
    const tag = await this.getTagById(id);
    await this.repository.delete(id);
  }

  async getTagsByIds(ids: string[]): Promise<Tag[]> {
    const tags = await this.repository.find({
      where: { id: In(ids) },
      relations: ['tasks'],
    });

    if (tags.length !== ids.length) {
      throw new NotFoundException('One or more tags not found');
    }

    return tags;
  }

  async getTagStats(): Promise<Array<{ tag: Tag; taskCount: number }>> {
    const tags = await this.repository.find({
      relations: ['tasks'],
    });

    return tags.map((tag) => ({
      tag,
      taskCount: tag.tasks.length,
    }));
  }

  async findSimilarTags(name: string): Promise<Tag[]> {
    return this.repository.find({
      where: { name: ILike(`%${name}%`) },
      relations: ['tasks'],
    });
  }

  async countTags(where: FindOptionsWhere<Tag>): Promise<number> {
    return this.repository.count({ where });
  }
}
