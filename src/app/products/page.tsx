"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const products = [
  {
    name: "Organic Aloe Fertilizer",
    description: "Special fertilizer mix for Aloe Vera and succulents",
    price: 75000,
    stock: 200,
    imgUrl:
      "https://www.aloeveraaustralia.com.au/wp-content/uploads/2018/10/Sunland-Aloevera-Fertiliser-1-1.jpg",
    category: "fertilizer",
    embedding: [0.123, -0.045, 0.002, 0.056],
    createdAt: "2025-10-16T00:00:00Z",
    updatedAt: "2025-10-16T00:00:00Z",
  },
  {
    name: "Organic Aloe Fertilizer",
    description: "Special fertilizer mix for Aloe Vera and succulents",
    price: 75000,
    stock: 200,
    imgUrl:
      "https://www.aloeveraaustralia.com.au/wp-content/uploads/2018/10/Sunland-Aloevera-Fertiliser-1-1.jpg",
    category: "fertilizer",
    embedding: [0.123, -0.045, 0.002, 0.056],
    createdAt: "2025-10-16T00:00:00Z",
    updatedAt: "2025-10-16T00:00:00Z",
  },
  {
    name: "Organic Aloe Fertilizer",
    description: "Special fertilizer mix for Aloe Vera and succulents",
    price: 75000,
    stock: 200,
    imgUrl:
      "https://www.aloeveraaustralia.com.au/wp-content/uploads/2018/10/Sunland-Aloevera-Fertiliser-1-1.jpg",
    category: "fertilizer",
    embedding: [0.123, -0.045, 0.002, 0.056],
    createdAt: "2025-10-16T00:00:00Z",
    updatedAt: "2025-10-16T00:00:00Z",
  },
  {
    name: "Organic Aloe Fertilizer",
    description: "Special fertilizer mix for Aloe Vera and succulents",
    price: 75000,
    stock: 200,
    imgUrl:
      "https://www.aloeveraaustralia.com.au/wp-content/uploads/2018/10/Sunland-Aloevera-Fertiliser-1-1.jpg",
    category: "fertilizer",
    embedding: [0.123, -0.045, 0.002, 0.056],
    createdAt: "2025-10-16T00:00:00Z",
    updatedAt: "2025-10-16T00:00:00Z",
  },
];

export default function ProductsPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      const cookies = document.cookie.split("; ");
      const authCookie = cookies.find((cookie) =>
        cookie.startsWith("Authorization=")
      );
      setIsSignedIn(Boolean(authCookie));
    };
    checkLogin();
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
            <Card
              key={index}
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="p-0">
                <div className="relative w-full aspect-square">
                  <Image
                    src={product.imgUrl}
                    alt={product.name}
                    fill
                    className="object-cover rounded-t-lg"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg font-semibold mb-2">
                  {product.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mb-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-emerald-700">
                    Rp {product.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Stock: {product.stock}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Category: {product.category}
                </p>
                <Button className="w-full" onClick={handleAddToCart}>
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
