import {Entity,PrimaryGeneratedColumn,Column,CreateDateColumn,} from "typeorm";

@Entity("magic_links")
export class MagicLink {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  email!: string;

  @Column()
  token_hash!: string;

  @Column({ type: "timestamp with time zone" })
  expires_at!: Date;

  @Column({ default: false })
  is_used!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
