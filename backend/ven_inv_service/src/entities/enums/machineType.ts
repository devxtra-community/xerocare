/**
 * The kind of equipment a product / service ticket concerns.
 *
 * PRINTER keeps the full meter-based service workflow (copy-count warranty,
 * SMA/FSMA per-click contracts, meter readings at every stage). COMPUTER and
 * OTHER have no usage meter: warranty is time-only and the only contract that
 * applies is a fixed AMC (RENT still works too).
 */
export enum MachineType {
  PRINTER = 'PRINTER',
  COMPUTER = 'COMPUTER',
  OTHER = 'OTHER',
}

export const DEFAULT_MACHINE_TYPE = MachineType.PRINTER;

/** PRINTER is the only meter-based type — everything else skips meter readings. */
export const isMeteredMachine = (t?: string | null): boolean =>
  (t ?? MachineType.PRINTER) === MachineType.PRINTER;
