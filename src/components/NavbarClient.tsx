"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Leaf, Menu, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
// ⬇️ GANTI path ini sesuai lokasi file action.ts kamu
import { handleLogout } from "@/action";

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

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      className="gap-2"
      disabled={pending}
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Logging out..." : "Logout"}
    </Button>
  );
}

export default function NavbarClient({ isSignedIn }: Props) {
  const [open, setOpen] = useState(false);

  const baseLinks = [{ href: "/products", label: "Products" }];

  const authedExtra = isSignedIn
    ? [
        { href: "/plants/dashboard", label: "Dashboard" },
        { href: "/plants/scan", label: "Scan" },
        { href: "/profile", label: "Profile" },
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
          {isSignedIn && (
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
          {isSignedIn ? (
            <form action={handleLogout}>
              <LogoutButton />
            </form>
          ) : (
            <Button asChild>
              <Link href="/register">Get started</Link>
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

              {isSignedIn && (
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

              {isSignedIn ? (
                <form action={handleLogout} onSubmit={() => setOpen(false)}>
                  <LogoutButton />
                </form>
              ) : (
                <Button
                  asChild
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/register">Get started</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
