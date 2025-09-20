"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }

      const data = await res.json();
      console.log("Login success:", data);

      // Redirect berdasarkan role
      if (data.role === "admin") {
        router.push("/cms/products");
      } else {
        router.push("/plants");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 lg:px-16">
        <div className="w-full max-w-md lg:max-w-lg bg-white shadow-lg rounded-xl border-0 p-6 md:p-8 lg:p-10">
          <div className="flex mb-6 md:mb-8">
            <button
              onClick={() => router.push("/login")} // Navigasi ke halaman login (halaman ini)
              className="flex-1 py-3 px-4 md:py-4 md:px-6 font-medium rounded-l-lg transition-colors bg-green-500 hover:bg-green-600 text-white"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/register")} // Navigasi ke halaman register
              className="flex-1 py-3 px-4 md:py-4 md:px-6 font-medium rounded-r-lg transition-colors bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              Register
            </button>
          </div>

          {/* Welcome text */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              Sign in to continue your plant care journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="block text-gray-700 font-medium text-sm md:text-base"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="yourusername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-12 md:h-14 px-3 md:px-4 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-20 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-gray-700 font-medium text-sm md:text-base"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 md:h-14 px-3 md:px-4 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-20 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 md:h-14 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium text-sm md:text-base rounded-lg transition-colors"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            {/* Link ke register */}
            <div className="text-center">
              <span className="text-gray-600 text-sm md:text-base">
                {"Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="text-green-500 hover:text-green-600 font-medium text-sm md:text-base"
              >
                Register here
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
