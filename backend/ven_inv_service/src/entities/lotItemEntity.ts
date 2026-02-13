import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Check,
} from 'typeorm';
import { Lot } from './lotEntity';
import { Model } from './modelEntity';
import { SparePart } from './sparePartEntity';

export enum LotItemType {
    MODEL = 'MODEL',
    SPARE_PART = 'SPARE_PART',
}

@Entity('lot_items')
@Check(
    `("model_id" IS NOT NULL AND "spare_part_id" IS NULL) OR ("model_id" IS NULL AND "spare_part_id" IS NOT NULL)`,
)
export class LotItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'lot_id' })
    lotId!: string;

    @ManyToOne(() => Lot, (lot) => lot.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lot_id' })
    lot!: Lot;

    @Column({ name: 'item_type', type: 'enum', enum: LotItemType })
    itemType!: LotItemType;

    @Column({ name: 'model_id', nullable: true })
    modelId?: string;

    @ManyToOne(() => Model, { nullable: true })
    @JoinColumn({ name: 'model_id' })
    model?: Model;

    @Column({ name: 'spare_part_id', nullable: true })
    sparePartId?: string;

    @ManyToOne(() => SparePart, { nullable: true })
    @JoinColumn({ name: 'spare_part_id' })
    sparePart?: SparePart;

    @Column({ type: 'int' })
    quantity!: number;

    @Column({ name: 'used_quantity', type: 'int', default: 0 })
    usedQuantity!: number;

    @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
    unitPrice!: number;

    @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
    totalPrice!: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
