export class EchoMessage {
  private constructor(private readonly value: string) {}

  static create(message: string): EchoMessage | null {
    if (message === '') {
      return null;
    }
    return new EchoMessage(message);
  }

  getValue(): string {
    return this.value;
  }
}
