import { Source } from '../config/dataSource';

async function checkEnum() {
  try {
    await Source.initialize();
    const result = await Source.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'credit_note_status_enum';
    `);
    interface EnumResult {
      enumlabel: string;
    }
    console.log(
      'Enum values:',
      result.map((r: EnumResult) => r.enumlabel),
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await Source.destroy();
  }
}

checkEnum();
