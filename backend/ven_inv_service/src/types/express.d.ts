import 'express';

declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      role: string;
      email?: string;
      branchId?: string;
    };
  }
}
