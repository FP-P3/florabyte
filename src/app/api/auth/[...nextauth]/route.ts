import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/db/config/mongodb';

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!, // Ganti dari GOOGLE_API_KEY ke GOOGLE_CLIENT_ID
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

                // Cek user berdasarkan googleEmail
                let existingUser = await db.collection('users').findOne({
                    $or: [
                        { googleEmail: user.email },
                        { username: user.email }
                    ]
                });

                if (!existingUser) {
                    // Buat user baru untuk sign-up otomatis
                    const now = new Date();
                    const doc = {
                        name: user.name,
                        username: user.email,
                        password: null,
                        role: 'user',
                        googleId: profile.sub,
                        googleEmail: user.email,
                        profilePicture: user.image,
                        createdAt: now,
                        updatedAt: now,
                    };

                    await db.collection('users').insertOne(doc);
                } else {
                    // Update Google ID jika belum ada
                    if (!existingUser.googleId) {
                        await db.collection('users').updateOne(
                            { _id: existingUser._id },
                            {
                                $set: {
                                    googleId: profile.sub,
                                    googleEmail: user.email,
                                    updatedAt: new Date()
                                }
                            }
                        );
                    }
                }

                return true;
            } catch (error) {
                console.error('Error in signIn callback:', error);
                return false;
            }
        },
        async redirect({ url, baseUrl }) {
            return '/profile';
        },
    },
    secret: process.env.NEXTAUTH_SECRET!,
});

export { handler as GET, handler as POST };