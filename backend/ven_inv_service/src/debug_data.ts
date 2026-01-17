import { Source } from './config/db';
import { Branch } from './entities/branchEntity';
import { Warehouse } from './entities/warehouseEntity';
import { Product } from './entities/productEntity';

async function debugInventory() {
  await Source.initialize();
  console.log('Database connected.');

  const branches = await Source.getRepository(Branch).find();
  console.log('Total Branches:', branches.length);
  branches.forEach((b) => console.log(`Branch: ${b.name} (${b.id})`));

  if (branches.length === 0) {
    console.log('No branches found.');
    return;
  }

  const branchId = branches[0].id;
  console.log(`\nDebugging for Branch: ${branches[0].name} (${branchId})`);

  const warehouses = await Source.getRepository(Warehouse).find({ where: { branchId } });
  console.log(`Warehouses for branch ${branchId}:`, warehouses.length);
  warehouses.forEach((w) => console.log(` - ${w.warehouseName} (${w.id})`));

  if (warehouses.length > 0) {
    const warehouseId = warehouses[0].id;
    const products = await Source.getRepository(Product).find({
      where: { warehouse: { id: warehouseId } },
    });
    console.log(`Products in Warehouse ${warehouses[0].warehouseName}:`, products.length);

    const count = await Source.getRepository(Product)
      .createQueryBuilder('product')
      .innerJoin('product.warehouse', 'warehouse')
      .where('warehouse.branchId = :branchId', { branchId })
      .getCount();
    console.log(`QueryBuilder Count for Branch ${branchId}:`, count);
  }

  await Source.destroy();
}

debugInventory().catch(console.error);
