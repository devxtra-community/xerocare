import { PrimaryGeneratedColumn,Column,CreateDateColumn,Entity,Index } from "typeorm";
import { OtpPurpose } from "../constants/otpPurpose";

@Entity("otp")
@Index(["email","purpose"])
export class Otp{
    @PrimaryGeneratedColumn("uuid")
    id!:string;

    @Column({type:"varchar",length:255})
    email!:string;

    @Column({type:"varchar",length:255})
    otp_hash!:string;

    @Column({type:"enum",enum:OtpPurpose,default:OtpPurpose.LOGIN})
    purpose!:OtpPurpose | null;
    
    @Column({type:"timestamp with time zone"})
    expireAt!:Date;

    @Column({type:"boolean",default: false})
    isUsed!: boolean;

    @CreateDateColumn({type:"timestamp with time zone"})
    createdAt!: Date;
}