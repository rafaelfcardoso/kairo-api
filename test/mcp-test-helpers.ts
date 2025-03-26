import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/**
 * Helper function to execute an MCP action
 */
export async function executeMcpAction(
  app: INestApplication,
  authToken: string,
  actionName: string,
  parameters: any,
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/mcp/actions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name: actionName,
      parameters,
    });

  return response;
}

/**
 * Helper function to create a test project
 */
export async function createTestProject(
  app: INestApplication,
  authToken: string,
  name: string,
  color = '#00FF00',
): Promise<{ id: string; name: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name,
      description: `${name} project for testing`,
      color,
    });

  return response.body;
}

/**
 * Helper function to create a test tag
 */
export async function createTestTag(
  app: INestApplication,
  authToken: string,
  name: string,
  color = '#FF0000',
): Promise<{ id: string; name: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/tags')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name,
      color,
    });

  return response.body;
}

/**
 * Helper function to create a test task
 */
export async function createTestTask(
  app: INestApplication,
  authToken: string,
  title: string,
  dueDate?: Date,
  projectId?: string,
  tagIds?: string[],
): Promise<any> {
  const taskData: any = {
    title,
  };

  if (dueDate) {
    taskData.dueDate = dueDate.toISOString();
  }

  if (projectId) {
    taskData.projectId = projectId;
  }

  if (tagIds && tagIds.length > 0) {
    taskData.tagIds = tagIds;
  }

  const response = await request(app.getHttpServer())
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${authToken}`)
    .send(taskData);

  return response.body;
}
