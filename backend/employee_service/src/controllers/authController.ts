import { Request, Response } from "express";
import { AuthService } from "../services/authService";

const authService = new AuthService();

export const login = async (req: Request, res: Response) => {
  try {
    
    const result = await authService.login(req.body);

    const {user, accessToken , refreshToken} = result;

    res.cookie("refreshToken",refreshToken,{
      httpOnly:true,
      secure:true,
      sameSite:"strict",
      maxAge: 15 * 24 * 60 * 60 * 1000
    })

    return res.status(200).json({
      message:"Login success",
      accessToken,
      data:user,
      success:true,
    })

  } catch (err:any) {
    return res.status(500).json({ message: err.message || "Internal server error", success: false });
  }
};

export const refresh = async(req:Request , res:Response)=>{
  try{
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken)
    {
      throw new Error("No refresh token");
    }

    const {accessToken,refreshToken:newRefreshToken} = await authService.refresh(refreshToken);

    res.cookie("refreshToken",newRefreshToken,{
      httpOnly:true,
      secure:true,
      sameSite:"strict",
      maxAge: 15 * 24 * 60 * 60 * 1000
    })

    res.json({message:"Access token refreshed",accessToken,success:true});

  }catch (err: any) {
    return res.status(500).json({ message: err.message || "Internal server error", success: false });
  }
}

export const logout = async(req:Request,res:Response)=>{
  try{
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);

    res.clearCookie("refreshToken");
    res.json({message:"logout successfull",success:true})

  }catch (err: any) {
    return res.status(500).json({ message: err.message || "Internal server error", success: false });
  }
}