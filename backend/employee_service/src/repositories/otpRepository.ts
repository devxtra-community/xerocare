import { Source } from "../config/dataSource";
import { OtpPurpose } from "../constants/otpPurpose";
import { Otp } from "../entities/otpEntities";

export class OtpRepository{
    private repo = Source.getRepository(Otp);

    async createOtp(data:Partial<Otp>)
    {
        const otp = this.repo.create(data);
        return this.repo.save(otp);
    }

    async findLatest(email:string,purpose:OtpPurpose){
        return this.repo.findOne({
            where:{email,purpose, is_used:false},
            order:{createdAt:"DESC"}
        });
    }

    async markUsed(id:string){
        return this.repo.update(id,{is_used:true})
    }
}