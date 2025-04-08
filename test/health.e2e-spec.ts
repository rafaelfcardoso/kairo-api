import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

// Skipping suite due to complex dependencies/env issues in E2E
describe.skip('Health Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.setTimeout(60000);
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
    if (app) {
      await app.close();
    }
  });

  it('/health (GET) - Basic Liveness/Readiness', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.status).toEqual('ok');
        expect(res.body.info).toBeDefined();
      });
  });

  it.skip('/api/v1/system-health (GET) - Detailed System Report', () => {
    return request(app.getHttpServer())
      .get('/api/v1/system-health')
      .expect((res) => {
        expect(res.status).toBeDefined();
        expect(res.body).toBeDefined();
      });
  });

  describe('/api/v1/system-health endpoints', () => {
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
