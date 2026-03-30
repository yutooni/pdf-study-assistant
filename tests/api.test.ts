import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('POST /documents', () => {
  const app = createApp();

  it('should upload a PDF file and return 201', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

    const response = await request(app)
      .post('/documents')
      .attach('file', pdfBuffer, 'test.pdf')
      .set('Content-Type', 'multipart/form-data');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('filename', 'test.pdf');
    expect(response.body).toHaveProperty('status', 'uploaded');
  });

  it('should return 400 when no file is uploaded', async () => {
    const response = await request(app).post('/documents');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'No file uploaded');
  });

  it('should return 400 when file is not a PDF', async () => {
    const txtBuffer = Buffer.from('plain text file');

    const response = await request(app)
      .post('/documents')
      .attach('file', txtBuffer, 'test.txt')
      .set('Content-Type', 'multipart/form-data');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Only PDF files are allowed');
  });
});
