import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { db } from '@/db/config/mongodb';

export async function GET(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('Authorization')?.value;
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [type, token] = authCookie.split(' ');
    if (type !== 'Bearer' || !token) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email ?? null,
      role: user.role ?? 'user',
      googleId: user.googleId ?? null,
      googleEmail: user.googleEmail ?? null,
      profilePicture: user.profilePicture ?? null,
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}