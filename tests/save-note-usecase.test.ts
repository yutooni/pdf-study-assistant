import { describe, it, expect } from 'vitest';
import { SaveNoteUseCase } from '../src/usecase/SaveNoteUseCase.js';
import { UploadDocumentUseCase } from '../src/usecase/UploadDocumentUseCase.js';
import { InMemoryDocumentRepository } from '../src/infra/InMemoryDocumentRepository.js';
import { UuidGenerator } from '../src/infra/UuidGenerator.js';

describe('SaveNoteUseCase', () => {
  it('should save note when document exists', async () => {
    const repository = new InMemoryDocumentRepository();
    const idGenerator = new UuidGenerator();
    const uploadUseCase = new UploadDocumentUseCase(repository, idGenerator);
    const saveNoteUseCase = new SaveNoteUseCase(repository);

    const uploadResult = await uploadUseCase.execute({ filename: 'test.pdf' });
    expect(uploadResult.ok).toBe(true);

    if (uploadResult.ok) {
      const saveNoteResult = await saveNoteUseCase.execute({
        id: uploadResult.value.id,
        content: 'My note content',
      });

      expect(saveNoteResult.ok).toBe(true);
      if (saveNoteResult.ok) {
        expect(saveNoteResult.value).not.toBeNull();
        expect(saveNoteResult.value?.id).toBe(uploadResult.value.id);
        expect(saveNoteResult.value?.note).toBe('My note content');
      }
    }
  });

  it('should return null when document does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    const saveNoteUseCase = new SaveNoteUseCase(repository);

    const result = await saveNoteUseCase.execute({
      id: 'non-existent-id',
      content: 'My note content',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it('should update existing note', async () => {
    const repository = new InMemoryDocumentRepository();
    const idGenerator = new UuidGenerator();
    const uploadUseCase = new UploadDocumentUseCase(repository, idGenerator);
    const saveNoteUseCase = new SaveNoteUseCase(repository);

    const uploadResult = await uploadUseCase.execute({ filename: 'test.pdf' });
    expect(uploadResult.ok).toBe(true);

    if (uploadResult.ok) {
      await saveNoteUseCase.execute({
        id: uploadResult.value.id,
        content: 'First note',
      });

      const updateResult = await saveNoteUseCase.execute({
        id: uploadResult.value.id,
        content: 'Updated note',
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value).not.toBeNull();
        expect(updateResult.value?.note).toBe('Updated note');
      }
    }
  });
});
