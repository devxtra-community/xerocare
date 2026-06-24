import mongoose from 'mongoose';
import { logger } from './logger';

export const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI as string;
    if (!mongoUri) {
      logger.warn('MONGO_URI not provided, skipping MongoDB connection');
      return;
    }
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Do not exit process, allow service to run without Mongo functionality
    logger.warn('Service starting without MongoDB functionality');
  }
};
