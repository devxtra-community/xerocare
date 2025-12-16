import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("admin")
export class Admin {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 255 })
    email!: string;

    @Column({ type: "varchar", length: 255 })
    password_hash!: string;

    @CreateDateColumn({ type: "timestamp with time zone" })
    createdAt!: Date;
}