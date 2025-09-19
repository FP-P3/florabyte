import { ObjectId } from "mongodb"

export type UserType = {
    _id?: ObjectId,
    username: string,
    password: string,        // hashed jika register biasa
    name: string,
    role: "user" | "admin",
    googleId?: string,       // optional jika bind Google
    googleEmail?: string,
    profilePicture?: string,        // avatar
    createdAt?: Date,
    updatedAt?: Date
}