import { Document } from '../domain/Document.js';
import { DocumentRepository } from '../domain/DocumentRepository.js';
import { Result } from '../domain/Result.js';

export class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Map<string, Document> = new Map();

  async save(document: Document): Promise<Result<Document>> {
    this.documents.set(document.id, document);
    return { ok: true, value: document };
  }

  async findById(id: string): Promise<Result<Document | null>> {
    const document = this.documents.get(id) || null;
    return { ok: true, value: document };
  }

  async updateNote(id: string, note: string): Promise<Result<Document | null>> {
    const document = this.documents.get(id);
    if (!document) {
      return { ok: true, value: null };
    }

    const updated = { ...document, note };
    this.documents.set(id, updated);
    return { ok: true, value: updated };
  }
}
