import { Source } from './src/config/db';

async function checkSchema() {
  try {
    await Source.initialize();
    const queryRunner = Source.createQueryRunner();
    const table = await queryRunner.getTable('lots');
    if (table) {
      console.log('Columns in "lots" table:');
      table.columns.forEach((col) => console.log(`- ${col.name} (${col.type})`));
    } else {
      console.log('Table "lots" not found');
    }
    await Source.destroy();
  } catch (err) {
    console.error('Error checking schema:', err);
  }
}

checkSchema();
