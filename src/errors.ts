export class AixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AixError";
  }
}
