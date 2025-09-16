import { compareSync, genSaltSync, hashSync } from "bcryptjs";

export const hashPassword = (password: string): string => {
  const salt = genSaltSync(10);
  return hashSync(password, salt);
};

export const compareHash = (password: string, hash: string): boolean => {
  return compareSync(password, hash);
};
