import { Document } from './Document.js';
import { Result } from './Result.js';

export interface DocumentRepository {
  save(document: Document): Promise<Result<Document>>;
  findById(id: string): Promise<Result<Document | null>>;
  updateNote(id: string, note: string): Promise<Result<Document | null>>;
}
