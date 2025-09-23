"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AddToCart({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(1);

  const add = async () => {
    try {
      setLoading(true);
      // panggil API sebanyak qty (kompatibel dgn /api/cart saat ini)
      for (let i = 0; i < qty; i++) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center h-10 rounded-xl border bg-white shadow-sm overflow-hidden">
        <button
          className="px-3 h-10 disabled:opacity-50"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1 || loading}
        >
          −
        </button>
        <span className="w-10 text-center font-semibold select-none">
          {qty}
        </span>
        <button
          className="px-3 h-10 disabled:opacity-50"
          onClick={() => setQty((q) => Math.min(99, q + 1))}
          disabled={loading}
        >
          +
        </button>
      </div>
      <Button onClick={add} disabled={loading}>
        {loading ? "Adding..." : "Add to cart"}
      </Button>
    </div>
  );
}
