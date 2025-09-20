import errorHandler from "@/app/helpers/errorHandler"
import UserModel from "@/db/model/UserModel"
import { sign } from "jsonwebtoken"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Validasi input dasar
    if (!username || !password) {
      throw { message: "Username/password are required", status: 400 }
    }

    // Panggil UserModel.login (sudah handle compare password)
    const user = await UserModel.login(username, password)

    // Sign JWT tanpa expiresIn
    const access_token = sign(
      { id: user._id?.toString(), username: user.username, role: user.role },
      process.env.JWT_SECRET as string
    )

    const cookieStore = await cookies()
    cookieStore.set("Authorization", `Bearer ${access_token}`, {
      httpOnly: true,  // Tidak bisa akses via JS
      secure: process.env.NODE_ENV === "production",  // Hanya HTTPS di production
      path: "/"
    })

    // Tambah role di response
    return Response.json({ access_token, role: user.role })
  } catch (error) {
    return errorHandler(error)
  }
}