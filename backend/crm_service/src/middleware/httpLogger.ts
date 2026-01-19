import morgan from 'morgan';
import { logger } from '../config/logger';

// Create a stream object for Morgan to use Winston
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// HTTP request logger middleware
export const httpLogger = morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream,
});
