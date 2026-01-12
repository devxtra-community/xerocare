export interface AddProductDTO {
  model_id: string;
  warehouse_id: string;
  vendor_id: number;
  serial_no: string;
  name: string;
  brand: string;
  MFD: string | Date;
  rent_price_monthly: number;
  rent_price_yearly: number;
  lease_price_monthly: number;
  lease_price_yearly: number;
  sale_price: number;
  tax_rate: number;
}

export interface BulkProductRow {
  model_no: string;
  warehouse_id: string;
  vendor_id: number | string;
  serial_no: string;
  name: string;
  brand: string;
  MFD: string | Date;
  rent_price_monthly: number;
  rent_price_yearly: number;
  lease_price_monthly: number;
  lease_price_yearly: number;
  sale_price: number;
  tax_rate: number;
}
