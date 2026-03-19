import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Admin } from '../entities/adminEntities';
import { logger } from '../config/logger';

export const seedAdmin = async (dataSource: DataSource) => {
  try {
    const adminRepo = dataSource.getRepository(Admin);

    const adminEmail = 'admin@xerocare.com';
    const adminExists = await adminRepo.findOne({ where: { email: adminEmail } });

    if (!adminExists) {
      logger.info('Seeding default admin user...');

      const hashedPassword = await bcrypt.hash('admin123', 10);

      const newAdmin = adminRepo.create({
        email: adminEmail,
        password_hash: hashedPassword,
        role: 'ADMIN',
      });

      await adminRepo.save(newAdmin);
      logger.info('Admin user seeded successfully.');
    } else {
      // In development, ensure the default admin has the correct password
      const isMatch = await bcrypt.compare('admin123', adminExists.password_hash);
      if (!isMatch && process.env.NODE_ENV !== 'production') {
        logger.info('Updating default admin password to admin123...');
        adminExists.password_hash = await bcrypt.hash('admin123', 10);
        await adminRepo.save(adminExists);
        logger.info('Admin password updated successfully.');
      } else {
        logger.info('Admin user already exists and password is correct or in production.');
      }
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
};
