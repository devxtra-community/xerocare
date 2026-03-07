import { Source } from './config/db';

async function checkSpareParts() {
  try {
    await Source.initialize();
    const queryRunner = Source.createQueryRunner();

    console.log('Checking tables...');
    const hasSparePartsModels = await queryRunner.hasTable('spare_parts_models');
    console.log('Table spare_parts_models exists:', hasSparePartsModels);

    const sparePartsTable = await queryRunner.getTable('spare_parts');
    console.log(
      'Columns in spare_parts table:',
      sparePartsTable?.columns.map((c) => c.name),
    );

    console.log('Simulating getInventory query...');
    const qb = Source.getRepository('SparePart')
      .createQueryBuilder('sp')
      .leftJoin('sp.model', 'model')
      .leftJoin('sp.branch', 'branch');

    // We need to handle Lot, Vendor, Warehouse specifically if they are entities
    // In the original code they are imported.
    // For simplicity in this script, I'll just check the core joins.

    console.log('Executing query...');
    const result = await qb.getRawMany();
    console.log('Query successful, found', result.length, 'rows');

    await Source.destroy();
  } catch (error) {
    console.error('Error during spare parts check:', error);
    process.exit(1);
  }
}

checkSpareParts();
