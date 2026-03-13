import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known operational errors
  if (err instanceof AppError) {
    logger.warn(
      { statusCode: err.statusCode, message: err.message, path: req.path },
      "Operational error"
    );

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Unknown errors — these are bugs
  logger.error(
    { err, path: req.path, method: req.method },
    "Unhandled error"
  );

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}