import axios from 'axios';
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: 'test', role: 'ADMIN', branchId: '2b4c50be-8457-41a4-afdc-188cba0966a3' },
  'test_secret_key',
  { expiresIn: '1h' },
);

async function check() {
  const res = await axios.get('http://localhost:3001/b/invoices/history?saleType=LEASE', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(JSON.stringify(res.data, null, 2));
}

check();
