import { signAccesstoken, signRefreshtoken } from '../utlis/jwt';
import { AuthRepository } from '../repositories/authRepository';
import { Request, Response } from 'express';
import { UAParser } from 'ua-parser-js';
import { publishEmailJob } from '../queues/emailProducer';
import { logger } from '../config/logger';
import { Employee } from '../entities/employeeEntities';
import { Admin } from '../entities/adminEntities';

const authRepo = new AuthRepository();

export async function issueTokens(user: Employee | Admin, req: Request, res: Response) {
  const accessToken = signAccesstoken({
    userId: user.id,
    branchId: 'branch_id' in user ? user.branch_id || '' : '',
    email: user.email,
    role: user.role,
    employeeJob: 'employee_job' in user ? user.employee_job : null,
    financeJob: 'finance_job' in user ? user.finance_job : null,
  });

  const refreshToken = signRefreshtoken({ id: user.id });

  const rawUserAgent = req.headers['user-agent'] || 'unknown';
  const parser = new UAParser(rawUserAgent);
  const result = parser.getResult();

  const deviceName =
    result.device.model || result.device.type || result.os.name || 'Unknown Device';
  const browserName =
    `${result.browser.name || 'Unknown Browser'} ${result.browser.version || ''}`.trim();
  const osName = `${result.os.name || 'Unknown OS'} ${result.os.version || ''}`.trim();

  await authRepo.saveRefreshToken(user, refreshToken, {
    ip_address: req.ip as string,
    user_agent: rawUserAgent,
  });

  // Publish login alert job
  publishEmailJob({
    type: 'LOGIN_ALERT',
    email: user.email,
    device: deviceName,
    browser: browserName,
    os: osName,
    ip: req.ip as string,
    time: new Date().toLocaleString(),
  }).catch((err: unknown) => logger.error('Failed to publish login alert job:', err));

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
}
