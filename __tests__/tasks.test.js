import request from 'supertest';
import matchers from 'jest-supertest-matchers';

import { Task, sequelize } from '../models';
import app from '..';
// import buildFilter from '../lib/filterBuilder';
// import { getFilteredTasks, findOrCreateTags } from '../lib/util';

import {
  seedUsers, seedStatuses, prepareTasks, getTaskCookie,
} from './helpers';
import { firstTask, secondTask } from './__fixtures__/tasks';

beforeAll(() => {
  expect.extend(matchers);
});

describe('tasks', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seedUsers();
    await seedStatuses();
  });

  let server;
  let cookie;
  const updatedTask = { ...secondTask, id: firstTask.id };

  beforeEach(async () => {
    server = app().listen();
    cookie = await getTaskCookie(server);
  });

  it('GET /tasks/new', async () => {
    const res = await request.agent(server)
      .get('/tasks/new')
      .set('Cookie', cookie);
    expect(res).toHaveHTTPStatus(200);
  });

  it('POST /tasks', async () => {
    const res = await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .send({ form: firstTask });
    expect(res).toHaveHTTPStatus(302);
  });

  it('POST /tasks with error', async () => {
    const res = await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .send({ form: { name: '' } });
    expect(res).toHaveHTTPStatus(200);
  });

  it('GET /tasks/:id', async () => {
    const res = await request.agent(server)
      .get(`/tasks/${firstTask.id}`);
    expect(res).toHaveHTTPStatus(200);
  });

  it('GET /tasks/:id/edit', async () => {
    const res = await request.agent(server)
      .get(`/tasks/${firstTask.id}/edit`)
      .set('Cookie', cookie);
    expect(res).toHaveHTTPStatus(200);
  });

  it('PATCH /tasks/:id', async () => {
    const res = await request.agent(server)
      .patch(`/tasks/${updatedTask.id}`)
      .set('Cookie', cookie)
      .type('form')
      .send({ form: updatedTask });
    expect(res).toHaveHTTPStatus(302);
  });

  it('PATCH /tasks/:id with errors', async () => {
    const res = await request.agent(server)
      .patch(`/tasks/${updatedTask.id}`)
      .set('Cookie', cookie)
      .type('form')
      .send({ form: { name: '' } });
    expect(res).toHaveHTTPStatus(200);
  });

  it('DELETE task without authorisation', async () => {
    const res = await request.agent(server)
      .delete(`/tasks/${updatedTask.id}/delete`);
    expect(res).toHaveHTTPStatus(302);
  });

  it('DELETE /tasks/:id/delete', async () => {
    const res = await request.agent(server)
      .delete(`/tasks/${updatedTask.id}/delete`)
      .set('Cookie', cookie);
    expect(res).toHaveHTTPStatus(302);
    const deletedTask = await Task.findByPk(updatedTask.id);
    expect(deletedTask).toBeNull();
  });

  afterEach(async (done) => {
    server.close();
    done();
  });
});

describe('filter tasks', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seedUsers();
    await seedStatuses();
    await prepareTasks();
  });

  let server;

  beforeEach(() => {
    server = app().listen();
  });

  it('all tasks', async () => {
    const res = await request.agent(server)
      .get('/tasks');
    expect(res).toHaveHTTPStatus(200);
  });

  it('by status, creator and  assignee', async () => {
    const res = await request.agent(server)
      .get('/tasks')
      .query({ statusId: 1, assigneeId: 1, creatorId: 2 });
    expect(res).toHaveHTTPStatus(200);
  });

  it('by tags', async () => {
    const res = await request.agent(server)
      .get('/tasks')
      .query({ tagsQuery: '#firstTag#secondTag' });
    expect(res).toHaveHTTPStatus(200);
  });

  afterEach(async (done) => {
    server.close();
    done();
  });
});
