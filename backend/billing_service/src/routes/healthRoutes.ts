import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    service: 'billing_service',
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

export default router;
