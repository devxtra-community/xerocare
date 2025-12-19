import { Source } from "../config/dataSource";
import { Auth } from "../entities/authEntities";
import { Employee } from "../entities/employeeEntities";
import { Admin } from "../entities/adminEntities";

type UserType = Employee | Admin;

export class AuthRepository{
    private authRepo = Source.getRepository(Auth);

    async saveRefreshToken(user: UserType , refreshToken: string){
        const auth = this.authRepo.create({
            employee: user instanceof Employee ? user : null,
            admin: user instanceof Admin ? user : null,
            refresh_token:refreshToken
        });
        return this.authRepo.save(auth);
    }

    async findByToken(refreshToken: string){
        return this.authRepo.findOne({
            where:{refresh_token:refreshToken},
            relations:["employee","admin"]
        })
    }

    async deleteToken(refreshToken: string){
        return this.authRepo.delete({refresh_token:refreshToken})
    }

    async deleteOtherTokens(
    userId: string,
    currentToken: string
  ) {
    return this.authRepo
      .createQueryBuilder()
      .delete()
      .where("employeeId = :userId", { userId })
      .andWhere("token != :currentToken", { currentToken })
      .execute();
  }
}