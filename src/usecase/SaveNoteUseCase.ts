import { Document } from '../domain/Document.js';
import { DocumentRepository } from '../domain/DocumentRepository.js';
import { Result } from '../domain/Result.js';

export interface SaveNoteInput {
  id: string;
  content: string;
}

export class SaveNoteUseCase {
  constructor(private readonly repository: DocumentRepository) {}

  async execute(input: SaveNoteInput): Promise<Result<Document | null>> {
    return await this.repository.updateNote(input.id, input.content);
  }
}
