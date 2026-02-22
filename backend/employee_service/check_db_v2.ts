import { Source } from './src/config/dataSource';
import { Payroll } from './src/entities/payrollEntity';

async function check() {
  await Source.initialize();
  const payrollRepo = Source.getRepository(Payroll);
  const payrolls = await payrollRepo.find();
  console.log('Total Payrolls:', payrolls.length);
  payrolls.forEach((p) => {
    console.log(
      `ID: ${p.id}, Branch: ${p.branch_id}, Date: ${p.year}-${p.month}, Amount: ${p.salary_amount}, Status: ${p.status}`,
    );
  });
  process.exit(0);
}
check();
