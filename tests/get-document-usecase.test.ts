import { describe, it, expect } from 'vitest';
import { GetDocumentUseCase } from '../src/usecase/GetDocumentUseCase.js';
import { UploadDocumentUseCase } from '../src/usecase/UploadDocumentUseCase.js';
import { InMemoryDocumentRepository } from '../src/infra/InMemoryDocumentRepository.js';
import { UuidGenerator } from '../src/infra/UuidGenerator.js';

describe('GetDocumentUseCase', () => {
  it('should return document when it exists', async () => {
    const repository = new InMemoryDocumentRepository();
    const idGenerator = new UuidGenerator();
    const uploadUseCase = new UploadDocumentUseCase(repository, idGenerator);
    const getUseCase = new GetDocumentUseCase(repository);

    const uploadResult = await uploadUseCase.execute({ filename: 'test.pdf' });
    expect(uploadResult.ok).toBe(true);

    if (uploadResult.ok) {
      const getResult = await getUseCase.execute({ id: uploadResult.value.id });

      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value).not.toBeNull();
        expect(getResult.value?.id).toBe(uploadResult.value.id);
        expect(getResult.value?.filename).toBe('test.pdf');
        expect(getResult.value?.status).toBe('uploaded');
      }
    }
  });

  it('should return null when document does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    const getUseCase = new GetDocumentUseCase(repository);

    const result = await getUseCase.execute({ id: 'non-existent-id' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});
