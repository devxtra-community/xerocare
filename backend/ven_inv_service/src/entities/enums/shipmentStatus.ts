/**
 * Logistics progress of a lot's inbound shipment — independent of
 * `LotStatus`, which tracks warehouse receiving (PENDING/RECEIVING/RECEIVED).
 * A shipment can be IN_TRANSIT for weeks before receiving even starts.
 */
export enum ShipmentStatus {
  PENDING_DISPATCH = 'PENDING_DISPATCH',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMS_CLEARANCE = 'CUSTOMS_CLEARANCE',
  ARRIVED = 'ARRIVED',
  RELEASED = 'RELEASED',
}
