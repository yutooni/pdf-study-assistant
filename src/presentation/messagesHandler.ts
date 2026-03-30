import { Request, Response } from 'express';
import { EchoMessageUseCase } from '../usecase/EchoMessageUseCase.js';
import { messageRepository } from '../usecase/repositories.js';
import { SystemTimeProvider } from './SystemTimeProvider.js';

const timeProvider = new SystemTimeProvider();

export const messagesHandler = (req: Request, res: Response): void => {
  const { message } = req.body;

  if (typeof message !== 'string') {
    res.status(400).json({ error: 'message must be a string' });
    return;
  }

  const usecase = new EchoMessageUseCase(messageRepository, timeProvider);
  const result = usecase.execute(message);

  if (!result.success) {
    if (result.error === 'empty') {
      res.status(400).json({ error: 'message must not be empty' });
    } else if (result.error === 'duplicate') {
      res.status(409).json({ error: 'duplicate message detected' });
    }
    return;
  }

  res.status(200).json({ message: result.message });
};
