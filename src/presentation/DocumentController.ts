import { Request, Response } from 'express';
import { UploadDocumentUseCase } from '../usecase/UploadDocumentUseCase.js';
import { GetDocumentUseCase } from '../usecase/GetDocumentUseCase.js';
import { SaveNoteUseCase } from '../usecase/SaveNoteUseCase.js';
import { InMemoryDocumentRepository } from '../infra/InMemoryDocumentRepository.js';
import { UuidGenerator } from '../infra/UuidGenerator.js';

export class DocumentController {
  private readonly uploadUseCase: UploadDocumentUseCase;
  private readonly getUseCase: GetDocumentUseCase;
  private readonly saveNoteUseCase: SaveNoteUseCase;

  constructor() {
    const repository = new InMemoryDocumentRepository();
    const idGenerator = new UuidGenerator();
    this.uploadUseCase = new UploadDocumentUseCase(repository, idGenerator);
    this.getUseCase = new GetDocumentUseCase(repository);
    this.saveNoteUseCase = new SaveNoteUseCase(repository);
  }

  async uploadDocument(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (req.file.mimetype !== 'application/pdf') {
      res.status(400).json({ error: 'Only PDF files are allowed' });
      return;
    }

    const result = await this.uploadUseCase.execute({
      filename: req.file.originalname,
    });

    if (!result.ok) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(201).json(result.value);
  }

  async getDocument(req: Request, res: Response): Promise<void> {
    const id = req.params.id;

    const result = await this.getUseCase.execute({ id });

    if (!result.ok) {
      res.status(500).json({ error: result.error });
      return;
    }

    if (result.value === null) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.status(200).json(result.value);
  }

  async saveNote(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    const content = req.body.content;

    if (typeof content !== 'string') {
      res.status(400).json({ error: 'content must be a string' });
      return;
    }

    const result = await this.saveNoteUseCase.execute({ id, content });

    if (!result.ok) {
      res.status(500).json({ error: result.error });
      return;
    }

    if (result.value === null) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.status(200).json(result.value);
  }
}
