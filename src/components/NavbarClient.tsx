"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  return (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      className="justify-start"
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
      } catch {}
    }
    loadMe();
    return () => {
      ignore = true;
    };
  }, []); // <- tidak tergantung isSignedIn

  const authed = Boolean(me) || isSignedIn;

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
          {/* Tombol Cart di desktop */}
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
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
              <SheetTitle className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white">
                  <Leaf className="h-4 w-4" />
                </span>
                Florabyte
              </SheetTitle>
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
                label="Cart"
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

              {authed ? (
                <Button
                  asChild
                  className="w-full"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/profile" className="flex items-center gap-3">
                    {me?.profilePicture ? (
                      <Image
                        src={me.profilePicture}
                        alt={me.name ? `${me.name}'s avatar` : "Profile"}
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover border"
                      />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white border">
                        <Leaf className="h-4 w-4" />
                      </span>
                    )}
                    <span>Profile</span>
                  </Link>
                </Button>
              ) : (
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
