import { Column,CreateDateColumn,UpdateDateColumn,PrimaryGeneratedColumn,Entity,Index } from "typeorm";
import { EmployeeRole } from "../constants/employeeRole";

@Entity("employee")
export class Employee{
    @PrimaryGeneratedColumn("uuid")
    id!:string;

    @Index({ unique: true })
    @Column({type:"varchar",length:255})
    email!:string;

    @Column({ type: "varchar", length: 255, nullable: true })
    first_name!: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    last_name!: string | null;


    @Column({type:"varchar",length:255})
    password_hash!:string;

    @Column({type:"enum",enum:EmployeeRole,default:EmployeeRole.EMPLOYEE})
    role!:EmployeeRole;

    @CreateDateColumn({type:"timestamp with time zone"})
    createdAt!:Date;

    @UpdateDateColumn({type:"timestamp with time zone"})
    updatedAt!:Date;

    @Column({type:"timestamp with time zone",nullable:true})
    expire_date!:Date | null;
}