/**
 * How a lot's goods are physically moving from vendor to warehouse.
 * Drives which fields in `Lot.shipmentDetails` are relevant (see MODE_DETAIL_FIELDS).
 */
export enum TransportMode {
  SEA = 'SEA',
  AIR = 'AIR',
  ROAD = 'ROAD',
  RAIL = 'RAIL',
  COURIER = 'COURIER',
  PICKUP = 'PICKUP',
  OTHER = 'OTHER',
}

/**
 * Whitelists which free-text keys are meaningful per transport mode, so
 * `shipmentDetails` doesn't accumulate irrelevant fields (e.g. a container
 * number on an air shipment). Enforced at the controller layer.
 */
export const MODE_DETAIL_FIELDS: Record<TransportMode, string[]> = {
  [TransportMode.SEA]: ['vessel', 'voyageNo', 'containerNo', 'billOfLadingNo'],
  [TransportMode.AIR]: ['airline', 'flightNo', 'airwayBillNo'],
  [TransportMode.ROAD]: ['transportCompany', 'vehicleNumber', 'driverName', 'lrNumber'],
  [TransportMode.RAIL]: ['railwayCompany', 'wagonNo', 'rrNumber'],
  [TransportMode.COURIER]: ['courierCompany', 'trackingNumber'],
  [TransportMode.PICKUP]: ['pickedUpBy'],
  [TransportMode.OTHER]: ['description'],
};
