export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public success: boolean;
  public code?: string;

  constructor(message: string, statusCode = 500, code?: string, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}
