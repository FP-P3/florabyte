"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

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
      toast.success("Welcome back!");

      if (data.role === "admin") {
        window.location.href = "/cms/products";
      } else {
        window.location.href = "/plants";
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg-home flex items-center justify-center">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl border border-white/30 p-8 m-4">
        {/* Toggle Buttons */}
        <div className="flex mb-8 rounded-lg overflow-hidden">
          <button className="flex-1 py-3 px-4 font-bold transition-colors bg-emerald-600 text-white shadow-md">
            Login
          </button>
          <button
            onClick={() => router.push("/register")}
            className="flex-1 py-3 px-4 font-medium transition-colors bg-white/50 hover:bg-white/70 text-emerald-800"
          >
            Register
          </button>
        </div>

        {/* Welcome text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-emerald-800/90">Sign in to tend to your garden.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-emerald-800 font-medium text-sm mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-12 px-4 bg-white/70 text-emerald-900 placeholder-emerald-700/60 border border-grey-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-emerald-800 font-medium text-sm mb-2"
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
              className="w-full h-12 px-4 bg-white/70 text-emerald-900 placeholder-emerald-700/60 border border-grey-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
