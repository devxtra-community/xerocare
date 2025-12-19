import { signAccesstoken, signRefreshtoken } from "../utlis/jwt";
import { AuthRepository } from "../repositories/authRepository";

const authRepo = new AuthRepository();

export async function issueTokens(user: any, res: any) {

  const accessToken = signAccesstoken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = signRefreshtoken({ id: user.id });

  await authRepo.saveRefreshToken(user, refreshToken);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });

  return {accessToken,refreshToken};
}
