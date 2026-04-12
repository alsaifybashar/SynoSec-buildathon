export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RequestError";
  }
}
