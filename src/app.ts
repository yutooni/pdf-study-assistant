import express, { Express } from 'express';
import { createRouter } from './presentation/router.js';

export const createApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use(createRouter());
  return app;
};
