'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface User {
    _id: string;
    name: string;
    username: string;
    email?: string;
    googleId?: string;
    googleEmail?: string;
}

export default function Profile() {
    const { data: session } = useSession();
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check login via auth custom
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => {
                console.log('ME Response status:', res.status);
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Not logged in');
                }
            })
            .then(data => {
                console.log('User data:', data);
                setIsLoggedIn(true);
                setUser(data);
            })
            .catch(err => {
                console.error('Error fetching user:', err);
                setIsLoggedIn(false);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleBindGoogle = () => {
        signIn('google');
    };

    const handleLogout = () => {
        // Logout dari auth custom
        document.cookie = 'Authorization=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        window.location.href = '/login';
    };

    if (loading) return <p>Loading...</p>;
    if (!isLoggedIn) return <p>Please login first.</p>;
    if (!user) return <p>User data not found.</p>;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <div className="space-y-2">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Username:</strong> {user.username}</p>
                {user.googleEmail && <p><strong>Google Email:</strong> {user.googleEmail}</p>}
                {user.googleId ? (
                    <p className="text-green-600">✅ Google Account Bound</p>
                ) : (
                    <button
                        onClick={handleBindGoogle}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Bind Google Account
                    </button>
                )}
                <div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}