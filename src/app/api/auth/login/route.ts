import errorHandler from "@/app/helpers/errorHandler";
import UserModel from "@/db/model/UserModel";
import { compareSync } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const user = await UserModel.login(username)
        if (!user) {
            throw { message: "Invalid Username/Password", status: 401 }
        }

        const isValid = compareSync(password, user.password)
        if (!isValid) {
            throw { message: "Invalid Username/Password", status: 401 }
        }

        const access_token = sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET as string)

        const cookieStore = await cookies()
        cookieStore.set("Authorization", `Bearer ${access_token}`)

        return Response.json({ access_token })
    } catch (error) {
        return errorHandler(error)
    }
}