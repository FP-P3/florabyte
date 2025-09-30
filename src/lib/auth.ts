import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { db } from "@/db/config/mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log("Google OAuth callback:", { user, account, profile });
        if (!profile) return false;
        // Cek user Google sudah ada atau belum
        const existingGoogleUser = await db.collection("users").findOne({
          googleId: profile.sub,
        });
        if (existingGoogleUser) return true;
        return true; // Bisa tambahkan logic create minimal doc kalau perlu
      } catch (err) {
        console.error("Error in signIn callback:", err);
        return false;
      }
    },
    async redirect() {
      return "/profile";
    },
  },
  pages: {
    signIn: "/profile",
  },
  secret: process.env.NEXTAUTH_SECRET!,
};
