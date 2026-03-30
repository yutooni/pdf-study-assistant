import { IdGenerator } from '../domain/IdGenerator.js';

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}
