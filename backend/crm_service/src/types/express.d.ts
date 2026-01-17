// Express Request extension for JWT payload (future auth implementation)
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  branchId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
