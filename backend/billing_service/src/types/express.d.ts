import { AccessTokenPayload } from './jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
  }
}
