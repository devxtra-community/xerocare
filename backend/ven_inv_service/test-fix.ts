/* eslint-disable */

import axios from 'axios';
import { sign } from 'jsonwebtoken';

const API_URL = 'http://localhost:3003'; // Adjust port if necessary
const VENDOR_ID = '7043e24f-aa0f-4336-bffc-ddde383f399a'; // From logs
const USER_ID = 'test-admin-user-id';
const EMAIL = 'testadmin@example.com';
const SECRET = process.env.ACCESS_SECRET || 'thisshanufromdevextra4321shanuriyas54678'; // Use the secret from .env

async function testRequestProducts() {
  try {
    // 1. Create a token for an admin user (who might not be in employee_managers)
    const token = sign(
      {
        userId: USER_ID,
        email: EMAIL,
        role: 'ADMIN',
      },
      SECRET,
      { expiresIn: '1h' },
    );

    console.log('Generated Token:', token);

    // 2. Send the request
    const response = await axios.post(
      `${API_URL}/vendors/${VENDOR_ID}/request-products`,
      {
        products: 'Test Product List',
        message: 'This is a test request',
        total_amount: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Response:', response.data);
    if (response.data.success) {
      console.log('✅ Request successful!');
    } else {
      console.error('❌ Request failed:', response.data);
    }
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Error Response:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testRequestProducts();
