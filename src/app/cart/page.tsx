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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Script from "next/script";

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
  const [errorType, setErrorType] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/cart");
      if (response.ok) {
        const data: CartData = await response.json();
        setCart(data);
      } else if (response.status === 401) {
        setErrorType("unauthorized");
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

  const handleCheckout = async () => {
    try {
      setPaying(true);
      const res = await fetch("/api/payment/create", { method: "POST" });
      if (!res.ok) {
        console.error("Create payment failed", await res.text());
        return;
      }
      const { token } = await res.json();
      // @ts-expect-error injected by Script
      window.snap.pay(token, {
        onSuccess: () => {
          fetchCart();
        },
        onPending: () => {},
        onError: (e: any) => {
          console.error("pay error", e);
        },
        onClose: () => {},
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPaying(false);
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

  if (errorType === "unauthorized") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Your Cart</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-lg mb-6">
                Anda belum memiliki barang untuk di checkout, silahkan login dan
                telusuri produk kami.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/login">
                  <Button>Login</Button>
                </Link>
                <Link href="/products">
                  <Button variant="outline">Telusuri Produk</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <Script
        src={
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>
        {cart.items.length === 0 ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  Your Cart
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg mb-6">
                  Anda belum memiliki produk untuk di checkout, silahkan
                  telusuri produk kami.
                </p>
                <div className="flex justify-center">
                  <Link href="/products">
                    <Button variant="outline">Telusuri Produk</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
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
              <Button
                className="mt-4"
                onClick={handleCheckout}
                disabled={paying}
              >
                {paying ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
