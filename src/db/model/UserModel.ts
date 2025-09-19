import { UserType } from "@/types/userType";
import * as z from "zod";
import { db } from "../config/mongodb";
import { hashSync, compareSync } from "bcryptjs";

const userSchema = z.object({
  name: z
    .string({ message: "Name is required" }) // Ganti required_error dengan message
    .trim()
    .min(1, { message: "Name is required" }),
  username: z
    .string({ message: "Username is required" }) // Ganti required_error dengan message
    .trim()
    .min(3, { message: "Username must be at least 3 characters" }),
  password: z
    .string({ message: "Password is required" }) // Ganti required_error dengan message
    .min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["user", "admin"]).default("user").optional(),
  googleId: z.string().optional(),
  googleEmail: z.string().email().optional(),
  profilePicture: z.string().url().optional(),
});

class UserModel {
  static async createUser(payload: Partial<UserType>) {
    const parsed = userSchema.parse(payload);

    // Set index unik sekali (jalankan di init app, bukan tiap request)
    await db.collection("users").createIndex({ username: 1 }, { unique: true });

    const existing = await db
      .collection("users")
      .findOne({ username: parsed.username });
    if (existing) {
      throw { message: "Username already registered", status: 400 };
    }

    const now = new Date();
    const doc: UserType = {
      name: parsed.name,
      username: parsed.username,
      password: hashSync(parsed.password, 10),
      role: parsed.role || "user",
      googleId: parsed.googleId,
      googleEmail: parsed.googleEmail,
      profilePicture: parsed.profilePicture,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").insertOne(doc);
    return { message: "Your Account has successfully registered" };
  }

  static async login(username: string, password: string) {
    const user = await db.collection("users").findOne({ username });
    if (!user) {
      throw { message: "Invalid username or password", status: 401 };
    }

    const isValid = compareSync(password, user.password);
    if (!isValid) {
      throw { message: "Invalid username or password", status: 401 };
    }

    // Return user tanpa password (untuk JWT atau session)
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export default UserModel;
