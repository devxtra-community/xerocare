import { Request, Response } from "express";
import { signJwt } from "../utlis/jwt";

export const verifyAuthentication = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const verify = signJwt({
      email: "shanu@gmail.com",
      password: "absdulkdh;osihdsoih",
    });
    console.log(verify);
    return res
      .status(500)
      .json({
        message: "Authentication successfull",
        AccessToken: "hello shanu how are you",
        status: true,
      });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Internal Error Occured", status: false });
  }
};
