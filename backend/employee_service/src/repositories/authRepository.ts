import { Source } from "../config/dataSource";
import { Auth } from "../entities/authEntities";
import { Employee } from "../entities/employeeEntities";
import { Admin } from "../entities/adminEntities";

type UserType = Employee | Admin;

export class AuthRepository{
    private authRepo = Source.getRepository(Auth);

    async saveRefreshToken(user: UserType, refreshToken: string,meta:{ip_address?:string,user_agent?:string}){
        const auth = this.authRepo.create({
            employee: user instanceof Employee ? user : null,
            admin: user instanceof Admin ? user : null,
            refresh_token:refreshToken,
            ip_address:meta.ip_address,
            user_agent:meta.user_agent,
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

    async getUserSessions(userId: string) {
    return this.authRepo.find({
        where: { employee: { id: userId } },
        order: { createdAt: "DESC" },
        });
    }

    async deleteSessionById(sessionId: string, userId: string) {
    return this.authRepo.delete({
        id: sessionId,
        employee: { id: userId },
    });
    }
}