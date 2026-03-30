import { TimeProvider } from '../usecase/TimeProvider.js';

export class SystemTimeProvider implements TimeProvider {
  now(): number {
    return Date.now();
  }
}
