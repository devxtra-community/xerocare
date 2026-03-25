import mongoose from 'mongoose';
import { logger } from './logger';

export const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI as string;
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
