import { Result, success } from './Result.js';

export interface MessageRepository {
  isDuplicate(message: string, currentTime: number, cooldownMs: number): Result<boolean>;
  saveMessage(message: string, timestamp: number): Result<void>;
}

export class InMemoryMessageRepository implements MessageRepository {
  private lastMessage: { message: string; timestamp: number } | null = null;

  isDuplicate(message: string, currentTime: number, cooldownMs: number): Result<boolean> {
    if (this.lastMessage === null) {
      return success(false);
    }

    if (this.lastMessage.message !== message) {
      return success(false);
    }

    const elapsed = currentTime - this.lastMessage.timestamp;
    return success(elapsed < cooldownMs);
  }

  saveMessage(message: string, timestamp: number): Result<void> {
    this.lastMessage = { message, timestamp };
    return success(undefined);
  }
}
