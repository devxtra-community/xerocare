import { Source } from '../config/db';

async function run() {
  try {
    await Source.initialize();
    console.log('Database connected.');

    const runner = Source.createQueryRunner();

    console.log('--- Columns for spare_parts ---');
    const sparePartsCols = await runner.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'spare_parts';
    `);
    console.table(sparePartsCols);

    console.log('--- Columns for model ---');
    const modelCols = await runner.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'model';
    `);
    console.table(modelCols);

    console.log('--- Columns for products ---');
    const productCols = await runner.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products';
    `);
    console.table(productCols);

    await Source.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
