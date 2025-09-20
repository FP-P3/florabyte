"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProductCard from "@/components/ProductCard";

export default function ProductsPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(""); // Tambah state untuk kategori

  useEffect(() => {
    const checkLogin = () => {
      const cookies = document.cookie.split("; ");
      const authCookie = cookies.find((cookie) =>
        cookie.startsWith("Authorization=")
      );
      setIsSignedIn(Boolean(authCookie));
    };
    checkLogin();

    fetchProducts(selectedCategory); // Panggil fetch dengan kategori
  }, [selectedCategory]); // Jalankan ulang saat kategori berubah

  const fetchProducts = async (category = "") => {
    try {
      const url = category
        ? `/api/products/category?category=${category}`
        : "/api/products";
      const response = await fetch(url);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleAddToCart = () => {
    if (!isSignedIn) {
      toast.error("Please log in to add items to your cart.");
    } else {
      toast.success("Item added to cart!");
    }
  };

  const categories = ["All", "soil", "fertilizer", "pesticide", "tools"]; // Array kategori

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Our Products
        </h1>
        {/* Tambah badge kategori di sini */}
        <div className="flex justify-center gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === "All" ? "" : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                (cat === "All" && selectedCategory === "") ||
                selectedCategory === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <ProductCard
              key={index}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
