export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public success: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}
