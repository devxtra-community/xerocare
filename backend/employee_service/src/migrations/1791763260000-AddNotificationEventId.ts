import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds broker event identity while keeping historical and direct notices valid. */
export class AddNotificationEventId1791763260000 implements MigrationInterface {
  name = 'AddNotificationEventId1791763260000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS event_id VARCHAR(100) NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_event_recipient
        ON notifications (event_id, employee_id)
        WHERE event_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Preserve event identity data during rollback. Removing the index is safe;
    // dropping event_id would discard deduplication state and is intentionally
    // left to an explicit recovery decision if a rollback is ever required.
    await queryRunner.query('DROP INDEX IF EXISTS uq_notifications_event_recipient');
  }
}
