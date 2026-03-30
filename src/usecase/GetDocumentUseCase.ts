import { Document } from '../domain/Document.js';
import { DocumentRepository } from '../domain/DocumentRepository.js';
import { Result } from '../domain/Result.js';

export interface GetDocumentInput {
  id: string;
}

export class GetDocumentUseCase {
  constructor(private readonly repository: DocumentRepository) {}

  async execute(input: GetDocumentInput): Promise<Result<Document | null>> {
    return await this.repository.findById(input.id);
  }
}
