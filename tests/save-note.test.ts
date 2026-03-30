import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('PUT /documents/:id/note', () => {
  const app = createApp();

  it('should return 200 when note is saved for existing document', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

    const uploadResponse = await request(app)
      .post('/documents')
      .attach('file', pdfBuffer, 'test.pdf')
      .set('Content-Type', 'multipart/form-data');

    expect(uploadResponse.status).toBe(201);
    const documentId = uploadResponse.body.id;

    const saveNoteResponse = await request(app)
      .put(`/documents/${documentId}/note`)
      .send({ content: 'This is my note' })
      .set('Content-Type', 'application/json');

    expect(saveNoteResponse.status).toBe(200);
    expect(saveNoteResponse.body).toHaveProperty('id', documentId);
    expect(saveNoteResponse.body).toHaveProperty('filename', 'test.pdf');
    expect(saveNoteResponse.body).toHaveProperty('status', 'uploaded');
    expect(saveNoteResponse.body).toHaveProperty('note', 'This is my note');
  });

  it('should return 404 when document does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .put(`/documents/${nonExistentId}/note`)
      .send({ content: 'This is my note' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Document not found');
  });

  it('should return 400 when content is not a string', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

    const uploadResponse = await request(app)
      .post('/documents')
      .attach('file', pdfBuffer, 'test.pdf')
      .set('Content-Type', 'multipart/form-data');

    expect(uploadResponse.status).toBe(201);
    const documentId = uploadResponse.body.id;

    const saveNoteResponse = await request(app)
      .put(`/documents/${documentId}/note`)
      .send({ content: 123 })
      .set('Content-Type', 'application/json');

    expect(saveNoteResponse.status).toBe(400);
    expect(saveNoteResponse.body).toHaveProperty('error', 'content must be a string');
  });
});
