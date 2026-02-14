import { ProductStatus, PrintColour } from '../entities/productEntity';

export interface AddProductDTO {
  model_id: string;
  warehouse_id: string;
  vendor_id: string | number;
  serial_no: string;
  product_status: ProductStatus;
  name: string;
  brand: string;
  MFD: string | Date;
  sale_price: number;
  tax_rate: number;
  print_colour?: PrintColour;
  max_discount_amount?: number | null;
  imageUrl?: string | null;
  lot_id?: string;
}

export interface BulkProductRow {
  model_no: string;
  warehouse_id: string;
  vendor_id: number | string;
  product_status: ProductStatus;
  serial_no: string;
  name: string;
  brand: string;
  MFD: string | Date;
  sale_price: number;
  tax_rate: number;
  print_colour?: PrintColour;
  max_discount_amount?: number | null;
  imageUrl?: string | null;
  lot_id?: string;
}
