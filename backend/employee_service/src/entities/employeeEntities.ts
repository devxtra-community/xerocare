import { Column,CreateDateColumn,UpdateDateColumn,PrimaryGeneratedColumn,Entity, ManyToOne, JoinColumn,Index } from "typeorm";
import { EmployeeRole } from "../constants/employeeRole";
import { Branch } from "./branchEntities";

@Entity("employee")
export class Employee{
    @PrimaryGeneratedColumn("uuid")
    id!:string;

    @Index({ unique: true })
    @Column({type:"varchar",length:255})
    email!:string;

    @Column({type:"varchar",length:255})
    password_hash!:string;

    @Column({type:"enum",enum:EmployeeRole,default:EmployeeRole.EMPLOYEE})
    role!:EmployeeRole;

    @ManyToOne(()=>Branch,{nullable:true,onDelete:"SET NULL"})
    @JoinColumn({name:"branch_id"})
    branch!:Branch|null;

    @CreateDateColumn({type:"timestamp with time zone"})
    createdAt!:Date;

    @UpdateDateColumn({type:"timestamp with time zone"})
    updatedAt!:Date;

    @Column({type:"timestamp with time zone",nullable:true})
    expire_date!:Date | null;
}