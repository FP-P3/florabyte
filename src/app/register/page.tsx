"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast"; // Tambahkan import ini

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_API}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, username, password }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }

      await res.json();
      toast.success("Registration successful!"); // Toast sukses
      router.push("/login"); // Redirect ke login
    } catch (err) {
      toast.error((err as Error).message || "An error occurred"); // Toast error
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
              onClick={() => router.push("/login")} // Navigasi ke halaman login
              className="flex-1 py-3 px-4 md:py-4 md:px-6 font-medium rounded-l-lg transition-colors bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/register")} // Navigasi ke halaman register (halaman ini)
              className="flex-1 py-3 px-4 md:py-4 md:px-6 font-medium rounded-r-lg transition-colors bg-green-500 hover:bg-green-600 text-white"
            >
              Register
            </button>
          </div>

          {/* Welcome text */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              Sign up to start your plant care journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-gray-700 font-medium text-sm md:text-base"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 md:h-14 px-3 md:px-4 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-20 transition-colors"
              />
            </div>

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
                className="w-full h-12 md:h-14 px-3 md:px-4 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-20 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 md:h-14 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium text-sm md:text-base rounded-lg transition-colors"
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>

            {/* Link ke login */}
            <div className="text-center">
              <span className="text-gray-600 text-sm md:text-base">
                {"Already have an account? "}
              </span>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-green-500 hover:text-green-600 font-medium text-sm md:text-base"
              >
                Login here
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
