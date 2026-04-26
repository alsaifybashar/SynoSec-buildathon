import { type NextFunction, type Request, type Response } from "express";

function isDevelopmentEnvironment() {
  const backendEnv = process.env["BACKEND_ENV"] ?? process.env["NODE_ENV"] ?? "development";
  return backendEnv.toLowerCase() === "development";
}

function formatDurationMs(startedAt: bigint) {
  return `${(Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(1)}ms`;
}

function formatRequestTarget(request: Request) {
  return request.originalUrl || request.url;
}

export function createRequestLogger() {
  return (request: Request, response: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();
    let logged = false;

    const logRequest = (event: "finish" | "close") => {
      if (logged) {
        return;
      }
      logged = true;

      const target = formatRequestTarget(request);
      const status = response.statusCode;
      const suffix = event === "close" ? " (connection closed)" : "";
      console.log(`${request.method} ${target} ${status} ${formatDurationMs(startedAt)}${suffix}`);
    };

    response.on("finish", () => {
      logRequest("finish");
    });
    response.on("close", () => {
      logRequest("close");
    });

    next();
  };
}

export function shouldEnableRequestLogging() {
  return isDevelopmentEnvironment();
}
