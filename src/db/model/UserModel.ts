import { UserType } from '@/types/userType'
import * as z from 'zod'
import { db } from '../config/mongodb'
import { hashSync } from 'bcryptjs'

const userSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    username: z.string().min(3, { message: "Username must be at least 3 character" }),
    password: z.string().min(6, { message: "Password must be at least 6 character" })
})

class UserModel {
    static async createUser(payload: UserType) {
        userSchema.parse(payload)

        const username = await db.collection("users").findOne({ username: payload.username })
        if (username) {
            throw { message: "Username already registered", status: 400 }
        }

        payload.password = hashSync(payload.password, 10)

        await db.collection("users").insertOne(payload)
    }

    static async login(username: string){
        return await db.collection("users").findOne({username})
    }
}

export default UserModel