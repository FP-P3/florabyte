import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { db } from '@/db/config/mongodb';

export async function POST(req: NextRequest) {
    try {
        console.log('=== BIND GOOGLE API CALLED ===');
        
        // Check if user is authenticated via custom auth
        const authCookie = req.cookies.get('Authorization')?.value;
        console.log('Auth cookie:', authCookie ? 'Present' : 'Missing');
        
        if (!authCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse "Bearer <token>"
        const [type, token] = authCookie.split(' ');
        if (type !== 'Bearer' || !token) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const currentUserId = decoded.id;
        console.log('Current user ID from token:', currentUserId);

        // Get the Google auth data from request body
        const requestBody = await req.json();
        console.log('Request body received:', requestBody);
        
        const { googleId, googleEmail, profilePicture } = requestBody;
        console.log('Extracted Google data:', { googleId, googleEmail, profilePicture });

        if (!googleId || !googleEmail) {
            console.error('Missing required Google data:', { googleId, googleEmail });
            return NextResponse.json({ error: 'Google ID and email are required' }, { status: 400 });
        }

        // Check if current user exists
        const currentUser = await db.collection('users').findOne({ _id: new ObjectId(currentUserId) });
        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if Google account is already linked to another user
        const googleLinkedUser = await db.collection('users').findOne({
            googleId: googleId,
            _id: { $ne: new ObjectId(currentUserId) }
        });

        if (googleLinkedUser) {
            return NextResponse.json({ 
                error: 'This Google account is already linked to another user' 
            }, { status: 409 });
        }

        // Check if current user already has a Google account linked
        if (currentUser.googleId) {
            return NextResponse.json({ 
                error: 'User already has a Google account linked' 
            }, { status: 409 });
        }

        // Link Google account to current user
        await db.collection('users').updateOne(
            { _id: new ObjectId(currentUserId) },
            {
                $set: {
                    googleId: googleId,
                    googleEmail: googleEmail,
                    profilePicture: profilePicture || currentUser.profilePicture,
                    updatedAt: new Date()
                }
            }
        );

        // Get updated user data (exclude password)
        const updatedUser = await db.collection('users').findOne(
            { _id: new ObjectId(currentUserId) },
            { projection: { password: 0 } }
        );

        return NextResponse.json({
            success: true,
            message: 'Google account successfully linked',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error binding Google account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}