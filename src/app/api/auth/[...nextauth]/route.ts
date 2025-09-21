import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/db/config/mongodb";

const handler = NextAuth({
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

        if (!profile) {
          console.error("Profile is undefined");
          return false;
        }

        const existingGoogleUser = await db.collection("users").findOne({
          googleId: profile.sub,
        });

        if (existingGoogleUser) {
          return true;
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
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
});

export { handler as GET, handler as POST };
