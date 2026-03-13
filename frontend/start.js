/* eslint-disable @typescript-eslint/no-require-imports */
const { fork } = require('child_process');

const delay = Number(process.env.START_DELAY || 0);

console.log(`Frontend waiting for ${delay}ms before starting...`);

setTimeout(() => {
  console.log('Starting Next.js frontend...');
  // Fork next start in the current directory
  const child = fork('node_modules/next/dist/bin/next', ['start'], { stdio: 'inherit' });

  // Forward signals downstream
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT', () => child.kill('SIGINT'));
}, delay);
