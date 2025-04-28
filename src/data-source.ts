import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from './config/typeorm.config';

export default new DataSource(typeOrmConfig);
