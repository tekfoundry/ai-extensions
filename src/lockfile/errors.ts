export class LockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockfileError";
  }
}
