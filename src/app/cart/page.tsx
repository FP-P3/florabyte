"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Script from "next/script";
import { Minus, Plus, Trash2 } from "lucide-react";

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
            {/* Grid kartu untuk items: satu per baris, panjang */}
            <div className="grid gap-4 grid-cols-1 mb-6">
              {cart.items.map((item) => (
                <Card key={item.productId} className="shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    {/* Desktop: 3 kolom (left info, center qty, right actions) */}
                    <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
                      {/* Left: image + name + price */}
                      <div className="flex items-start gap-4 min-w-0">
                        <Image
                          src={item.imgUrl}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="h-20 w-20 object-cover rounded-xl flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base md:text-lg line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-emerald-700 font-semibold">
                            Rp {item.price.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Center: qty pill */}
                      <div className="md:justify-self-center">
                        <div className="inline-flex items-center h-10 rounded-xl border bg-white shadow-sm overflow-hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-none"
                            onClick={() => handleDecreaseQty(item.productId)}
                            disabled={item.qty <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-semibold select-none">
                            {item.qty}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-none"
                            onClick={() => handleIncreaseQty(item.productId)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Right: subtotal + remove */}
                      <div className="flex items-center gap-4 md:justify-self-end">
                        <div className="text-sm md:text-base">
                          <span className="font-medium">Subtotal: </span>
                          Rp {(item.price * item.qty).toLocaleString()}
                        </div>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          onClick={() => handleRemoveItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Total dan Checkout */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <p className="text-xl font-semibold">
                    Total: Rp {cart.total.toLocaleString()}
                  </p>
                  <Button onClick={handleCheckout} disabled={paying} size="lg">
                    {paying ? "Processing..." : "Checkout"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
