import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['/health'],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return legacy health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toEqual('ok');
          expect(res.body).toHaveProperty('note');
          expect(res.body).toHaveProperty('enhancedEndpoints');
        });
    });
  });

  describe('/api/v1/system-health endpoints', () => {
    it('/api/v1/system-health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system-health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('details');
        });
    });

    it('/api/v1/system-health/detailed (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system-health/detailed')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('environment');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('process');
          expect(res.body).toHaveProperty('system');
          expect(res.body).toHaveProperty('database');

          // Check database status
          expect(res.body.database).toHaveProperty('status');
        });
    });

    it('/api/v1/system-health/db (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system-health/db')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.info).toHaveProperty('database');
          expect(res.body.info.database.status).toEqual('up');
        });
    });

    it('/api/v1/system-health/memory (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/system-health/memory')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.info).toHaveProperty('memory_heap');
          expect(res.body.info).toHaveProperty('memory_rss');
        });
    });
  });
});
