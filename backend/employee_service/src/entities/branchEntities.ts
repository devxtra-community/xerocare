import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

@Entity("branch")
export class Branch {
    @PrimaryGeneratedColumn("uuid")
    id!: string

    @Column({ type: "varchar", length: 255 })
    branch_name!: string

    @Column({ type: "varchar" })
    branch_address!: string

    @Column({ type: "boolean", default: true })
    isActive!: boolean;

    @CreateDateColumn({ type: "timestamp with time zone" })
    createdAt!: Date;
    

    @UpdateDateColumn({ type: "timestamp with time zone" })
    updatedAt!: Date;
}