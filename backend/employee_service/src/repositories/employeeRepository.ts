import { Source } from "../config/dataSource";
import { Employee } from "../entities/employeeEntities";

export class EmployeeRepository{
    private repo = Source.getRepository(Employee);

    async findByEmail(email:string){
        return this.repo.findOne({where:{email}});
    }

    async createEmployee(data: Partial<Employee>){
        const employee = this.repo.create(data);
        return this.repo.save(employee);
    }
    
}