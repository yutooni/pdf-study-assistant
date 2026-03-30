import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /documents/:id', () => {
  const app = createApp();

  it('should return 200 when document exists', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

    const uploadResponse = await request(app)
      .post('/documents')
      .attach('file', pdfBuffer, 'test.pdf')
      .set('Content-Type', 'multipart/form-data');

    expect(uploadResponse.status).toBe(201);
    const documentId = uploadResponse.body.id;

    const getResponse = await request(app).get(`/documents/${documentId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toHaveProperty('id', documentId);
    expect(getResponse.body).toHaveProperty('filename', 'test.pdf');
    expect(getResponse.body).toHaveProperty('status', 'uploaded');
  });

  it('should return 404 when document does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app).get(`/documents/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Document not found');
  });
});
