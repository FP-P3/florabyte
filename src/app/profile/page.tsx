"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

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
  const [bindingGoogle, setBindingGoogle] = useState(false);
  const [unbindingGoogle, setUnbindingGoogle] = useState(false);

  useEffect(() => {
    // Check login via auth custom
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        console.log("ME Response status:", res.status);
        if (res.ok) {
          return res.json();
        } else {
          throw new Error("Not logged in");
        }
      })
      .then((data) => {
        console.log("User data:", data);
        setIsLoggedIn(true);
        setUser(data);
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
        setIsLoggedIn(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Handle Google OAuth callback for binding
  const handleGoogleBinding = useCallback(
    async (googleUser: {
      id?: string | null;
      sub?: string;
      email?: string | null;
      image?: string | null;
    }) => {
      try {
        setBindingGoogle(true);

        // Debug: Log the Google user data
        console.log("Google user data received:", googleUser);
        console.log("Full session data:", session);

        // Extract Google ID - try different possible fields
        const sessionUser = session?.user as {
          id?: string;
          email?: string;
          image?: string;
        };

        // Try multiple ways to get Google ID
        let googleId = googleUser.id || googleUser.sub || sessionUser?.id;

        // If still no Google ID, try to get it from session account
        if (!googleId && session) {
          console.log("Trying to get Google ID from session...");
          // Sometimes Google ID is in different places in the session
          const sessionData = session as {
            token?: { sub?: string };
            account?: { providerAccountId?: string };
          };
          googleId =
            sessionData?.token?.sub || sessionData?.account?.providerAccountId;
        }

        const googleEmail = googleUser.email || sessionUser?.email;
        const profilePicture = googleUser.image || sessionUser?.image;

        console.log("Extracted data:", {
          googleId,
          googleEmail,
          profilePicture,
        });

        // If we still don't have the required data, try alternative approach
        if (!googleId || !googleEmail) {
          console.warn(
            "Missing Google data, will try to use session user data directly"
          );

          // Last resort: use session user data as-is
          const finalGoogleId = googleId || "temp_" + Date.now(); // Temporary ID if none found
          const finalGoogleEmail = googleEmail;

          if (!finalGoogleEmail) {
            console.error("Still missing Google email:", {
              finalGoogleId,
              finalGoogleEmail,
            });
            alert(
              "Failed to get Google account information. Please try again."
            );
            await signOut({ redirect: false });
            return;
          }

          googleId = finalGoogleId;
        }

        const response = await fetch("/api/auth/bind-google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            googleId: googleId,
            googleEmail: googleEmail,
            profilePicture: profilePicture,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("Google account successfully bound:", result);
          setUser(result.user);
          // Sign out from NextAuth after successful binding
          await signOut({ redirect: false });
          alert("Google account successfully linked to your profile!");
        } else {
          console.error("Error binding Google account:", result.error);
          alert(`Error: ${result.error}`);
          await signOut({ redirect: false });
        }
      } catch (error) {
        console.error("Error during Google binding:", error);
        alert("An error occurred while linking your Google account");
        await signOut({ redirect: false });
      } finally {
        setBindingGoogle(false);
      }
    },
    [session]
  ); // useCallback dependency

  useEffect(() => {
    if (session?.user && isLoggedIn && !user?.googleId) {
      handleGoogleBinding(session.user);
    }
  }, [session, isLoggedIn, user?.googleId, handleGoogleBinding]); // Fixed dependency

  const handleBindGoogle = () => {
    if (user?.googleId) {
      alert("Google account is already linked");
      return;
    }

    // Trigger Google OAuth for binding
    signIn("google", {
      redirect: false,
      callbackUrl: "/profile",
    });
  };

  const handleUnbindGoogle = async () => {
    if (!user?.googleId) {
      alert("No Google account is linked");
      return;
    }

    if (!confirm("Are you sure you want to unlink your Google account?")) {
      return;
    }

    try {
      setUnbindingGoogle(true);

      const response = await fetch("/api/auth/unbind-google", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Google account successfully unbound:", result);
        setUser(result.user);
        alert("Google account successfully unlinked from your profile!");
      } else {
        console.error("Error unbinding Google account:", result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error during Google unbinding:", error);
      alert("An error occurred while unlinking your Google account");
    } finally {
      setUnbindingGoogle(false);
    }
  };

  const handleLogout = async () => {
    try {
      // 1) Clear custom auth cookie on server (httpOnly)
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // 2) Sign out NextAuth session if present (safe to call regardless)
      await signOut({ redirect: false });

      // 3) Clear client-side storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      // 4) Redirect to login
      window.location.assign("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Force redirect even if there's an error
      window.location.assign("/login");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!isLoggedIn) return <p>Please login first.</p>;
  if (!user) return <p>User data not found.</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="space-y-2">
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Username:</strong> {user.username}
        </p>
        {user.googleEmail && (
          <p>
            <strong>Google Email:</strong> {user.googleEmail}
          </p>
        )}
        {user.googleId ? (
          <div className="space-y-2">
            <p className="text-green-600">✅ Google Account Bound</p>
            <button
              onClick={handleUnbindGoogle}
              disabled={unbindingGoogle}
              className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-orange-600"
            >
              {unbindingGoogle ? "Unlinking..." : "Unbind Google Account"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleBindGoogle}
            disabled={bindingGoogle}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600"
          >
            {bindingGoogle ? "Linking..." : "Bind Google Account"}
          </button>
        )}
        <div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout (Destroy All Sessions)
          </button>
        </div>
      </div>
    </div>
  );
}
