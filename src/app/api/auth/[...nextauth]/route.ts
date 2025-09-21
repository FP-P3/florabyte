import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/db/config/mongodb';

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
                console.log('Google OAuth callback:', { user, account, profile });

                if (!profile) {
                    console.error('Profile is undefined');
                    return false;
                }

                // For binding purposes, we don't create or update users here
                // The binding will be handled by the separate API endpoint
                // This callback just allows the OAuth flow to complete
                
                // Only check if this Google account already exists in regular sign-in flow
                const existingGoogleUser = await db.collection('users').findOne({
                    googleId: profile.sub
                });

                // If Google user exists, allow sign-in (regular Google login)
                if (existingGoogleUser) {
                    return true;
                }

                // For new Google users or binding scenarios, 
                // we'll let the OAuth complete and handle the rest in the profile page
                return true;

            } catch (error) {
                console.error('Error in signIn callback:', error);
                return false;
            }
        },
        async redirect() {
            return '/profile';
        },
    },
    pages: {
        // Don't create accounts automatically
        signIn: '/profile',
    },
    secret: process.env.NEXTAUTH_SECRET!,
});

export { handler as GET, handler as POST };