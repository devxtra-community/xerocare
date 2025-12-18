import { Request,Response,NextFunction } from "express";
import { verifyAccessToken } from "../utlis/jwt";

export const authMiddleware = (req:Request,res:Response,next:NextFunction)=>{
    const token = req.headers?.authorization?.split(" ")[1];
    console.log(req.headers)
    if(!token)
    {
        return res.status(401).json({message:"No access token",success:false})
    }

    const decoded = verifyAccessToken(token);
    if(!decoded)
    {
        return res.status(401).json({message:"Invalid access token",success:false});
    }

    req.user = decoded;
    next();
}