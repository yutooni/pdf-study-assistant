import { Document } from '../domain/Document.js';
import { DocumentRepository } from '../domain/DocumentRepository.js';
import { Result } from '../domain/Result.js';
import { IdGenerator } from '../domain/IdGenerator.js';

export interface UploadDocumentInput {
  filename: string;
}

export class UploadDocumentUseCase {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(input: UploadDocumentInput): Promise<Result<Document>> {
    const document: Document = {
      id: this.idGenerator.generate(),
      filename: input.filename,
      status: 'uploaded',
    };

    const result = await this.repository.save(document);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, value: result.value };
  }
}
