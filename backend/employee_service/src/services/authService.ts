import { Request, Response } from "express";
import { EmployeeRepository } from "../repositories/employeeRepository";

const tokenCreation = (req: Request, res: Response) => {
  try {
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "internal server error", success: false });
  }
};
