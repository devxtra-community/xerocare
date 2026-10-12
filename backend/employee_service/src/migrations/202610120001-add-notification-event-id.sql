-- Batch 2C: broker event identity for safe notification redelivery.
-- Existing rows remain NULL and are intentionally outside the unique index.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS event_id VARCHAR(100) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_event_recipient
  ON notifications (event_id, employee_id)
  WHERE event_id IS NOT NULL;
