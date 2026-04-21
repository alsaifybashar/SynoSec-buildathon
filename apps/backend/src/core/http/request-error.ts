type RequestErrorOptions = {
  cause?: unknown;
  code?: string;
  userFriendlyMessage?: string;
};

export class RequestError extends Error {
  readonly code: string | undefined;
  readonly userFriendlyMessage: string | undefined;

  constructor(
    readonly status: number,
    message: string,
    codeOrOptions?: string | RequestErrorOptions,
    maybeOptions?: RequestErrorOptions
  ) {
    const options = typeof codeOrOptions === "string"
      ? { ...maybeOptions, code: codeOrOptions }
      : codeOrOptions;

    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "RequestError";
    this.code = options?.code;
    this.userFriendlyMessage = options?.userFriendlyMessage;
  }
}
