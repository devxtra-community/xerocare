import { Source } from '../config/dataSource';

export interface TrustedDeviceRow {
  id: string;
  user_id: string;
  user_type: string;
  device_token_hash: string;
  device_name: string | null;
  ip_address: string | null;
  last_used_at: string;
  expires_at: string;
  created_at: string;
}

export class TrustedDeviceRepository {
  async findValid(hash: string, userId: string): Promise<TrustedDeviceRow | null> {
    const rows = await Source.query(
      `SELECT * FROM trusted_devices WHERE device_token_hash = $1 AND user_id = $2 AND expires_at > NOW()`,
      [hash, userId],
    );
    return rows[0] || null;
  }

  async touch(hash: string) {
    await Source.query(
      `UPDATE trusted_devices SET last_used_at = NOW() WHERE device_token_hash = $1`,
      [hash],
    );
  }

  async create(
    userId: string,
    hash: string,
    deviceName: string,
    ipAddress: string | undefined,
    expiresAt: Date,
  ) {
    await Source.query(
      `INSERT INTO trusted_devices (user_id, user_type, device_token_hash, device_name, ip_address, expires_at)
       VALUES ($1, 'EMPLOYEE', $2, $3, $4, $5)
       ON CONFLICT (device_token_hash) DO NOTHING`,
      [userId, hash, deviceName, ipAddress || null, expiresAt],
    );
  }

  async listByUser(userId: string): Promise<TrustedDeviceRow[]> {
    return Source.query(
      `SELECT id, device_name, ip_address, last_used_at, expires_at, created_at
       FROM trusted_devices WHERE user_id = $1 ORDER BY last_used_at DESC`,
      [userId],
    );
  }

  /** Ownership-scoped so one user can't revoke another's device by guessing an id. */
  async deleteById(id: string, userId: string): Promise<number> {
    const rows = await Source.query(
      `DELETE FROM trusted_devices WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );
    return rows.length;
  }

  async deleteAllForUser(userId: string) {
    await Source.query(`DELETE FROM trusted_devices WHERE user_id = $1`, [userId]);
  }

  async deleteExpired() {
    await Source.query(`DELETE FROM trusted_devices WHERE expires_at < NOW()`);
  }
}
