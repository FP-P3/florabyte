import { sign, verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const signToken = (payload: object) => {
  return sign(payload, JWT_SECRET);
};

export const verifyToken = (token: string) => {
  return verify(token, JWT_SECRET);
};
