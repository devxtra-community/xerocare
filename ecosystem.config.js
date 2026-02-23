module.exports = {
  apps: [
    {
      name: 'api_gateway',
      cwd: './backend/api_gateway',
      script: 'pnpm',
      args: 'start',
      env: { PORT: 3001 },
    },
    {
      name: 'billing_service',
      cwd: './backend/billing_service',
      script: 'pnpm',
      args: 'start',
      env: { PORT: 3004 },
    },
    {
      name: 'crm_service',
      cwd: './backend/crm_service',
      script: 'pnpm',
      args: 'start',
      env: { PORT: 3005 },
    },
    {
      name: 'employee_service',
      cwd: './backend/employee_service',
      script: 'pnpm',
      args: 'start',
      env: { PORT: 3002 },
    },
    {
      name: 'ven_inv_service',
      cwd: './backend/ven_inv_service',
      script: 'pnpm',
      args: 'start',
      env: { PORT: 3003 },
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'pnpm',
      args: 'dev',
      env: { PORT: 3000 },
    },
  ],
};
