import { Router } from 'express';
import { healthHandler } from './healthHandler.js';
import { messagesHandler } from './messagesHandler.js';

export const createRouter = (): Router => {
  const router = Router();
  router.get('/health', healthHandler);
  router.post('/messages', messagesHandler);
  return router;
};
