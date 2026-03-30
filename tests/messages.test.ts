import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('POST /messages', () => {
  it('should return 200 with the same message', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/messages')
      .send({ message: 'hello' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'hello' });
  });

  it('should return 400 when message is empty', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/messages')
      .send({ message: '' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when message is not a string', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/messages')
      .send({ message: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 409 when sending duplicate message', async () => {
    const app = createApp();

    await request(app)
      .post('/messages')
      .send({ message: 'hello' });

    const response = await request(app)
      .post('/messages')
      .send({ message: 'hello' });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
  });

  it('should allow different messages', async () => {
    const app = createApp();

    const response1 = await request(app)
      .post('/messages')
      .send({ message: 'first' });

    const response2 = await request(app)
      .post('/messages')
      .send({ message: 'second' });

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  it('should allow same message after cooldown period', async () => {
    const app = createApp();

    await request(app)
      .post('/messages')
      .send({ message: 'hello' });

    // Wait for cooldown period (5 seconds + buffer)
    await new Promise(resolve => setTimeout(resolve, 5100));

    const response = await request(app)
      .post('/messages')
      .send({ message: 'hello' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'hello' });
  });
});
