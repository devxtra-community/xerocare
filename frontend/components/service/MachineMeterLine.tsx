import { meterSourceLabel, type MachineAllocation } from '@/lib/machineAllocations';

/**
 * A machine's last meter reading on the service ticket's machine cards, with where and
 * when it was taken. The reading is shared by every flow — service tickets and contracts,
 * and Rent/Lease installation, monthly usage and replacement — so the source matters:
 * it tells the technician whether the figure is from last week's rent bill or a service
 * visit months ago.
 */
export function MachineMeterLine({
  machine,
  label = 'Last Reading',
}: {
  machine: Pick<MachineAllocation, 'meterReading' | 'meterReadingAt' | 'meterReadingSource'>;
  label?: string;
}) {
  if (machine.meterReading == null) return null;
  const source = meterSourceLabel(machine.meterReadingSource);
  const date = machine.meterReadingAt
    ? new Date(machine.meterReadingAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;
  return (
    <div className="col-span-2">
      {label}:{' '}
      <span className="font-semibold text-slate-700">
        {Number(machine.meterReading).toLocaleString()}
      </span>
      {(source || date) && (
        <span className="text-slate-400"> · {[source, date].filter(Boolean).join(' · ')}</span>
      )}
    </div>
  );
}
