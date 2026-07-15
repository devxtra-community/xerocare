import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Admin } from '../entities/adminEntities';
import { logger } from '../config/logger';

export const seedAdmin = async (dataSource: DataSource) => {
  try {
    const adminRepo = dataSource.getRepository(Admin);

    const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@xerocare.com';
    const isProduction = process.env.NODE_ENV === 'production';

    // In production the seed password MUST come from the environment — never a
    // hardcoded default that ends up in every deployment.
    const seedPassword = process.env.ADMIN_SEED_PASSWORD || (isProduction ? null : 'admin123');

    const adminExists = await adminRepo.findOne({ where: { email: adminEmail } });

    if (!adminExists) {
      if (!seedPassword) {
        logger.error(
          'No admin user exists and ADMIN_SEED_PASSWORD is not set — skipping admin seeding. ' +
            'Set ADMIN_SEED_PASSWORD in the environment to create the initial admin.',
        );
        return;
      }

      logger.info('Seeding default admin user...');

      const hashedPassword = await bcrypt.hash(seedPassword, 10);

      const newAdmin = adminRepo.create({
        email: adminEmail,
        password_hash: hashedPassword,
        role: 'ADMIN',
      });

      await adminRepo.save(newAdmin);
      logger.info('Admin user seeded successfully.');
    } else if (!isProduction && seedPassword) {
      // In development, ensure the default admin has the expected password
      const isMatch = await bcrypt.compare(seedPassword, adminExists.password_hash);
      if (!isMatch) {
        logger.info('Updating default admin password to the seed password...');
        adminExists.password_hash = await bcrypt.hash(seedPassword, 10);
        await adminRepo.save(adminExists);
        logger.info('Admin password updated successfully.');
      }
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
};
