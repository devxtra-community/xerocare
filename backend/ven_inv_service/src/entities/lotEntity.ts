import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendorEntity';
import { LotItem } from './lotItemEntity';
import { LotDocument } from './lotDocumentEntity';
import { Warehouse } from './warehouseEntity';
import { PurchaseOrigin } from './enums/purchaseOrigin';
import { TransportMode } from './enums/transportMode';
import { ShipmentStatus } from './enums/shipmentStatus';

export enum LotStatus {
  PENDING = 'PENDING',
  RECEIVING = 'RECEIVING',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED', // kept for backward compatibility
  CANCELLED = 'CANCELLED',
}

@Entity('lots')
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lot_number', type: 'varchar', length: 50, unique: true })
  @Index()
  lotNumber!: string;

  // Nullable: internal stock-transfer lots have no vendor.
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId?: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate!: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'enum', enum: LotStatus, default: LotStatus.PENDING })
  status!: LotStatus;

  // Copied from the awarding RFQ at lot creation. Snapshot — never recalculated.
  @Column({
    name: 'purchase_origin',
    type: 'enum',
    enum: PurchaseOrigin,
    nullable: true,
  })
  @Index()
  purchaseOrigin?: PurchaseOrigin;

  // -------------
  // Shipment / logistics info — how the goods are physically moving from the
  // vendor to the warehouse. Independent of `status`, which tracks warehouse
  // receiving. All nullable: unknown until the vendor books the shipment.

  @Column({ name: 'transport_mode', type: 'enum', enum: TransportMode, nullable: true })
  transportMode?: TransportMode;

  @Column({ name: 'carrier_name', type: 'varchar', length: 150, nullable: true })
  carrierName?: string;

  @Column({ name: 'dispatch_date', type: 'date', nullable: true })
  dispatchDate?: Date;

  @Column({ name: 'estimated_arrival', type: 'date', nullable: true })
  estimatedArrival?: Date;

  @Column({ name: 'actual_arrival', type: 'date', nullable: true })
  actualArrival?: Date;

  @Column({ name: 'shipment_status', type: 'enum', enum: ShipmentStatus, nullable: true })
  shipmentStatus?: ShipmentStatus;

  // Mode-specific fields (vessel/voyage/container/BL# for SEA, airline/flight/AWB#
  // for AIR, vehicle/driver/LR# for ROAD, ...). Shape depends on transportMode —
  // see MODE_DETAIL_FIELDS. Validated/whitelisted at the controller, not the DB.
  @Column({ name: 'shipment_details', type: 'jsonb', nullable: true })
  shipmentDetails?: Record<string, string>;

  // -------------

  // True for lots auto-created by a stock transfer — no vendor, no amounts in the UI.
  @Column({ name: 'transfer_origin', type: 'boolean', default: false })
  transferOrigin!: boolean;

  @Column({ name: 'transfer_id', type: 'uuid', nullable: true })
  transferId?: string;

  @Column({ name: 'branch_id', nullable: true })
  branch_id?: string;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouse_id?: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode?: string;

  @Column({
    name: 'exchange_rate_snapshot',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  exchangeRateSnapshot?: number;

  @OneToMany(() => LotItem, (lotItem) => lotItem.lot, { cascade: true })
  items!: LotItem[];

  // Shipping/customs paperwork (bill of lading, customs declaration, etc.).
  // Never cascade-deleted from the app side — retained for compliance.
  @OneToMany(() => LotDocument, (doc) => doc.lot)
  documents!: LotDocument[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
