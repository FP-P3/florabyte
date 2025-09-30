import errorHandler from "@/helpers/errorHandler";
import { signToken } from "@/db/helpers/jwt";
import UserModel from "@/db/model/UserModel";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      throw { message: "Username and password are required", status: 400 };
    }

    // Panggil UserModel.login (sudah handle compare password)
    const user = await UserModel.login(username, password);

    // Sign JWT tanpa expiresIn
    const access_token = signToken({
      id: user._id?.toString(),
      username: user.username,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set("Authorization", `Bearer ${access_token}`, {
      httpOnly: true,  // Tidak bisa akses via JS
      secure: process.env.NODE_ENV === "production",  // Hanya HTTPS di production
      path: "/",
    });

    // Tambah role di response
    return Response.json({ access_token, role: user.role });
  } catch (error) {
    return errorHandler(error);
  }
}