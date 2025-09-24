"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Leaf, Menu, ShoppingCart } from "lucide-react";
import Image from "next/image";
import type { UserType } from "@/types/userType";

type Props = { isSignedIn: boolean };

function NavButton({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const activeClass = active
    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700"
    : "";

  return (
    <Button
      asChild
      variant={active ? "default" : "ghost"}
      className={`justify-start ${activeClass}`}
      onClick={onClick}
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export default function NavbarClient({ isSignedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Pick<
    UserType,
    "name" | "profilePicture" | "role"
  > | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [bump, setBump] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    async function loadMe() {
      try {
        // SELALU cek session di client (fallback jika SSR salah)
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as UserType;
        if (!ignore)
          setMe({
            name: data.name,
            profilePicture: data.profilePicture,
            role: (data as any).role,
          });
      } catch { }
    }
    loadMe();
    return () => {
      ignore = true;
    };
  }, []); // <- tidak tergantung isSignedIn

  const authed = Boolean(me) || isSignedIn;
  const hasItems = authed && cartCount > 0;

  // Ambil jumlah item cart saat user terautentikasi
  useEffect(() => {
    let ignore = false;
    async function fetchCartCount() {
      try {
        if (!authed) return;
        const res = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          if (!ignore) setCartCount(0);
          return;
        }
        const data = await res.json();
        // data.items = [{qty:number}]
        const count: number = Array.isArray(data?.items)
          ? data.items.reduce((acc: number, it: any) => acc + Number(it?.qty || 0), 0)
          : 0;
        if (!ignore) {
          setCartCount((prev) => {
            if (prev !== count) {
              setBump(true);
              setTimeout(() => setBump(false), 600);
            }
            return count;
          });
        }
      } catch {
        if (!ignore) setCartCount(0);
      }
    }
    fetchCartCount();

    const handleRefresh = () => fetchCartCount();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchCartCount();
    };
    window.addEventListener("cart:refresh", handleRefresh as any);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleRefresh);
    return () => {
      ignore = true;
      window.removeEventListener("cart:refresh", handleRefresh as any);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [authed]);

  const baseLinks = [{ href: "/products", label: "Products" }];

  const authedExtra = authed
    ? [
      { href: "/plants", label: "Dashboard" },
      { href: "/plants/scan", label: "Scan" },
      ...(me?.role === "admin"
        ? [{ href: "/admin/orders", label: "Admin Orders" }]
        : []),
    ]
    : [];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-600 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Florabyte
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {baseLinks.map((l) => (
            <NavButton key={l.href} href={l.href} label={l.label} />
          ))}
          {authed && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              {authedExtra.map((l) => (
                <NavButton key={l.href} href={l.href} label={l.label} />
              ))}
            </>
          )}
        </div>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-2">
          {/* Tombol Cart di desktop dengan badge */}
          <Button asChild variant="ghost" size="icon" aria-label="Cart" className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              {hasItems && (
                <span
                  className={`absolute -top-1.5 -right-1.5 grid min-w-5 h-5 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white shadow ring-1 ring-white ${bump ? "animate-bounce" : ""
                    }`}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </Button>

          {authed ? (
            <Link href="/profile" aria-label="Profile" className="block">
              {me?.profilePicture ? (
                <Image
                  src={me.profilePicture}
                  alt={me.name ? `${me.name}'s avatar` : "Profile"}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover border"
                />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white border">
                  <Leaf className="h-5 w-5" />
                </span>
              )}
            </Link>
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              {authed && me ? (
                <SheetTitle>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3"
                    onClick={() => setOpen(false)}
                  >
                    {me.profilePicture ? (
                      <Image
                        src={me.profilePicture}
                        alt={me.name ? `${me.name}'s avatar` : "Profile"}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover border"
                      />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white border">
                        {me.name ? (
                          me.name.charAt(0).toUpperCase()
                        ) : (
                          <Leaf className="h-4 w-4" />
                        )}
                      </span>
                    )}
                    <span className="font-medium">{me.name || "Profile"}</span>
                  </Link>
                </SheetTitle>
              ) : (
                <SheetTitle className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white">
                    <Leaf className="h-4 w-4" />
                  </span>
                  Florabyte
                </SheetTitle>
              )}
            </SheetHeader>

            <div className="mt-4 flex flex-col gap-1">
              {baseLinks.map((l) => (
                <NavButton
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  onClick={() => setOpen(false)}
                />
              ))}

              {/* Tambah item Cart di mobile */}
              <NavButton
                href="/cart"
                label={`Cart${hasItems ? ` (${cartCount > 99 ? "99+" : cartCount})` : ""}`}
                onClick={() => setOpen(false)}
              />

              {authed && (
                <>
                  <Separator className="my-2" />
                  {authedExtra.map((l) => (
                    <NavButton
                      key={l.href}
                      href={l.href}
                      label={l.label}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </>
              )}

              <Separator className="my-2" />

              {!authed && (
                <Button
                  asChild
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/login">Get started</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
