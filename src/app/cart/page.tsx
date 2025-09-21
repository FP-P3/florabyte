"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  imgUrl: string;
  qty: number;
}

interface CartData {
  items: CartItem[];
  total: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartData>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/cart");
      if (response.ok) {
        const data: CartData = await response.json();
        setCart(data);
      } else {
        console.error("Failed to fetch cart");
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseQty = async (productId: string) => {
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action: "increase" }),
      });
      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        console.error("Failed to increase qty");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDecreaseQty = async (productId: string) => {
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action: "decrease" }),
      });
      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        console.error("Failed to decrease qty");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        console.error("Failed to remove item");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
        <div className="container mx-auto px-4 py-8">
          <p>Loading cart...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>
        {cart.items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <Image
                        src={item.imgUrl}
                        alt={item.name}
                        width={50}
                        height={50}
                        className="object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>Rp {item.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecreaseQty(item.productId)}
                          disabled={item.qty <= 1} // Disable jika qty=1
                        >
                          -
                        </Button>
                        <span>{item.qty}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIncreaseQty(item.productId)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      Rp {(item.price * item.qty).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveItem(item.productId)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 text-right">
              <p className="text-xl font-semibold">
                Total: Rp {cart.total.toLocaleString()}
              </p>
              <Button className="mt-4">Checkout</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
