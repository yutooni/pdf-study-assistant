import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from './DocumentController.js';

export const createRouter = (): Router => {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage() });
  const controller = new DocumentController();

  router.post('/documents', upload.single('file'), (req, res) =>
    controller.uploadDocument(req, res)
  );

  router.get('/documents/:id', (req, res) =>
    controller.getDocument(req, res)
  );

  router.put('/documents/:id/note', (req, res) =>
    controller.saveNote(req, res)
  );

  return router;
};
