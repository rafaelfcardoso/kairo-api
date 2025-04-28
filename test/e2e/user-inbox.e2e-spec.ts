import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('User Registration & Inbox Project (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user and creates a user-specific Inbox project', async () => {
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const name = 'Test User';

    // Register user
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(email);

    // Login to get JWT
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = loginRes.body.access_token;
    expect(token).toBeDefined();

    // Get projects for this user
    const projectsRes = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Find Inbox project
    const inbox = projectsRes.body.find((p: any) => p.name === 'Inbox');
    expect(inbox).toBeDefined();
    expect(inbox.userId).toBe(res.body.id);
    // Optionally: check type, isSystem, and root status
    // expect(inbox.type).toBe('inbox');
    // expect(inbox.isSystem).toBe(true);
    // expect(inbox.parentId).toBeNull();
  });
});
