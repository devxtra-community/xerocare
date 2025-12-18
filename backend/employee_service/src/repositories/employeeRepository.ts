import { Source } from "../config/dataSource";
import { Employee } from "../entities/employeeEntities";

export class EmployeeRepository{
    private repo = Source.getRepository(Employee);

    async findByEmail(email:string){
        return this.repo.findOne({where:{email}});
    }

    async findById(id:string){
        return this.repo.findOne({where:{id}});
    }

    async createEmployee(data: Partial<Employee>){
        const employee = this.repo.create(data);
        return this.repo.save(employee);
    }

    async updatePassword(userId:string, passwordHash:string){
        return this.repo.update(userId,{
            password_hash:passwordHash
        })
    }
    
}