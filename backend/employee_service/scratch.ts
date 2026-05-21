import { AppError } from './src/errors/appError';
const err = new AppError('test', 401);
console.log(err instanceof AppError);
