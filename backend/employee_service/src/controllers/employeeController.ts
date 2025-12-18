import { Request,Response } from "express";
import { EmployeeService} from "../services/employeeService";

const service = new EmployeeService();

export const addEmployee = async(req:Request,res:Response)=>{
    try{
        const employee = await service.addEmployee(req.body)
        res.status(201).json({message:"Employee created successfully",data:employee})
    }
    catch(err:any)
    {
        res.status(400).json({error:err.message})
    }
}