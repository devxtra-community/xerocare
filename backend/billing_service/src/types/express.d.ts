import { AccessTokenPayload } from './jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
    branchFilter: string[]; // Set by parseBranchFilter: [] = all, [id] = single, [id1,id2] = multi
    isMultiBranch: boolean;
  }
}
