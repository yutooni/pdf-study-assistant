import { describe, it, expect } from 'vitest';
import { UploadDocumentUseCase } from '../src/usecase/UploadDocumentUseCase.js';
import { InMemoryDocumentRepository } from '../src/infra/InMemoryDocumentRepository.js';
import { UuidGenerator } from '../src/infra/UuidGenerator.js';

describe('UploadDocumentUseCase', () => {
  it('should create a document with uploaded status', async () => {
    const repository = new InMemoryDocumentRepository();
    const idGenerator = new UuidGenerator();
    const usecase = new UploadDocumentUseCase(repository, idGenerator);

    const result = await usecase.execute({ filename: 'test.pdf' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBeDefined();
      expect(result.value.filename).toBe('test.pdf');
      expect(result.value.status).toBe('uploaded');
    }
  });

  it('should generate unique IDs for different documents', async () => {
    const repository = new InMemoryDocumentRepository();
    const idGenerator = new UuidGenerator();
    const usecase = new UploadDocumentUseCase(repository, idGenerator);

    const result1 = await usecase.execute({ filename: 'test1.pdf' });
    const result2 = await usecase.execute({ filename: 'test2.pdf' });

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.value.id).not.toBe(result2.value.id);
    }
  });
});
