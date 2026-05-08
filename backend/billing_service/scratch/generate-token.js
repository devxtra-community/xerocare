// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'FINANCE_MANAGER',
    branchId: 'test-branch',
  },
  'thisshanufromdevextra4321shanuriyas54678',
  { expiresIn: '1h' },
);
console.log(token);
