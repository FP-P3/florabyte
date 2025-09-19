"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProductCard from "@/components/ProductCard";

export default function ProductsPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const checkLogin = () => {
      const cookies = document.cookie.split("; ");
      const authCookie = cookies.find((cookie) =>
        cookie.startsWith("Authorization=")
      );
      setIsSignedIn(Boolean(authCookie));
    };
    checkLogin();

    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = () => {
    if (!isSignedIn) {
      toast.error("Please log in to add items to your cart.");
    } else {
      toast.success("Item added to cart!");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Our Products
        </h1>
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
