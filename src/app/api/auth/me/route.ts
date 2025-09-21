import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { db } from '@/db/config/mongodb';

export async function GET(req: NextRequest) {
    try {
        // Check cookie 'Authorization' dengan format "Bearer <token>"
        const authCookie = req.cookies.get('Authorization')?.value;
        if (!authCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse "Bearer <token>"
        const [type, token] = authCookie.split(' ');
        if (type !== 'Bearer' || !token) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }; // Ganti userId menjadi id

        // Query user dari database
        const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return user data (exclude password)
        const { password, ...userData } = user;
        return NextResponse.json(userData);
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}