import { DataSource } from 'typeorm';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const source = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'billing_db',
  entities: [Invoice, InvoiceItem],
  synchronize: false,
});

const run = async () => {
  try {
    await source.initialize();
    console.log('Database connected');

    const invoiceRepo = source.getRepository(Invoice);
    const invoice = await invoiceRepo.findOne({
      where: { invoiceNumber: 'INV-2026-0003' },
    });

    if (invoice) {
      console.log('Invoice Found:', invoice.invoiceNumber);
      console.log('SaleType:', invoice.saleType);
      console.log('LeaseType:', invoice.leaseType);
      console.log('Tenure:', invoice.leaseTenureMonths);
      console.log('Total Lease Amount:', invoice.totalLeaseAmount);
    } else {
      console.log('Invoice INV-2026-0003 not found. Showing latest:');
      const latest = await invoiceRepo.find({
        order: { createdAt: 'DESC' },
        take: 1,
      });
      if (latest.length > 0) {
        console.log('Latest Invoice:', latest[0].invoiceNumber);
        console.log('SaleType:', latest[0].saleType);
        console.log('LeaseType:', latest[0].leaseType);
        console.log('Tenure:', latest[0].leaseTenureMonths);
      } else {
        console.log('No invoices found.');
      }
    }

    await source.destroy();
  } catch (error) {
    console.error('Error:', error);
  }
};

run();
