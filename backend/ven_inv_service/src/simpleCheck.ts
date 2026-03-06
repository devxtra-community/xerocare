import { Source } from './config/db';

async function check() {
  try {
    await Source.initialize();
    const results = await Source.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('spare_parts', 'spare_parts_models', 'models')
        `);
    console.log('Tables found:', results);

    const columns = await Source.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('spare_parts', 'spare_parts_models')
        `);
    console.log('Columns found:', columns);

    await Source.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
check();
