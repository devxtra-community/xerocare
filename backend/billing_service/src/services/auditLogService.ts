import { Source } from '../config/dataSource';
import { AuditLog } from '../entities/auditLogEntity';

export async function logAudit(
  entityId: string,
  action: string,
  performedBy: string,
  details?: string,
  oldValue?: string,
  newValue?: string,
) {
  try {
    const repo = Source.getRepository(AuditLog);
    const auditLog = repo.create({
      entityId,
      action,
      performedBy,
      details,
      oldValue,
      newValue,
    });
    await repo.save(auditLog);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
