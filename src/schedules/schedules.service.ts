import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}

  async findAll(userId: string): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: { userId },
    });
  }

  async findOne(id: string, userId: string): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, userId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async create(
    createScheduleDto: CreateScheduleDto,
    userId: string,
  ): Promise<Schedule> {
    const schedule = this.scheduleRepository.create({
      ...createScheduleDto,
      userId,
    });

    return this.scheduleRepository.save(schedule);
  }

  async update(
    id: string,
    updateScheduleDto: UpdateScheduleDto,
    userId: string,
  ): Promise<Schedule> {
    const schedule = await this.findOne(id, userId);

    // Update the schedule
    Object.assign(schedule, updateScheduleDto);

    return this.scheduleRepository.save(schedule);
  }

  async remove(id: string, userId: string): Promise<void> {
    const schedule = await this.findOne(id, userId);
    await this.scheduleRepository.remove(schedule);
  }
}
