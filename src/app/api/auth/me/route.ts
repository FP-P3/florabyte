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
      phone: user.phone ?? null,
      address: user.address ?? null,
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('Authorization')?.value;
    if (!authCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [type, token] = authCookie.split(' ');
    if (type !== 'Bearer' || !token) return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const body = await req.json();
    const name = (body.name ?? '').toString().trim();
    const username = (body.username ?? '').toString().trim();
    const phone = body.phone === null || body.phone === undefined ? null : (body.phone ?? '').toString().trim();
    const address = body.address === null || body.address === undefined ? null : (body.address ?? '').toString().trim();

    if (!name || !username) {
      return NextResponse.json({ error: 'Name and username are required' }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    const userId = new ObjectId(decoded.id);
    // Ensure unique username (excluding self)
    const existing = await db.collection('users').findOne({ username, _id: { $ne: userId } });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const now = new Date();
    const update: any = { name, username, updatedAt: now };
    // Allow clearing phone/address by sending empty string -> store null
    if (phone !== undefined) update.phone = phone && phone.length ? phone : null;
    if (address !== undefined) update.address = address && address.length ? address : null;

    const result = await db.collection('users').updateOne({ _id: userId }, { $set: update });
    if (result.matchedCount === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = await db.collection('users').findOne({ _id: userId });
    return NextResponse.json({
      _id: updated!._id,
      name: updated!.name,
      username: updated!.username,
      email: updated!.email ?? null,
      role: updated!.role ?? 'user',
      googleId: updated!.googleId ?? null,
      googleEmail: updated!.googleEmail ?? null,
      profilePicture: updated!.profilePicture ?? null,
      phone: updated!.phone ?? null,
      address: updated!.address ?? null,
      createdAt: updated!.createdAt ?? null,
      updatedAt: updated!.updatedAt ?? null,
    });
  } catch (error: any) {
    console.error('PATCH /api/auth/me error', error);
    return NextResponse.json({ error: error?.message || 'Failed to update profile' }, { status: error?.status || 500 });
  }
}