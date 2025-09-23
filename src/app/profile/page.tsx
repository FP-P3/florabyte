"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo } from "react";

interface User {
  _id: string;
  name: string;
  username: string;
  email?: string | null;
  role?: string | null;
  googleId?: string | null;
  googleEmail?: string | null;
  profilePicture?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export default function Profile() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bindingGoogle, setBindingGoogle] = useState(false);
  const [unbindingGoogle, setUnbindingGoogle] = useState(false);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  interface OrderHistoryItem {
    id: string;
    midtransOrderId?: string;
    status: "Pending" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan"; // orderStatus
    paymentStatus: "paid" | "cancelled";
    total: number;
    createdAt: string;
    updatedAt?: string;
    items: { productId: string; name: string; price: number; qty: number }[];
  }

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then((data) => {
        console.log("/api/auth/me profilePicture:", data.profilePicture);
        setIsLoggedIn(true);
        setUser(data);
      })
      .catch((err) => {
        console.warn("Failed loading /api/auth/me", err);
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGoogleBinding = useCallback(
    async (googleUser: { id?: string | null; sub?: string; email?: string | null; image?: string | null }) => {
      try {
        setBindingGoogle(true);
        const sessionUser = session?.user as { id?: string; email?: string; image?: string };
        let googleId =
          googleUser.id ||
          googleUser.sub ||
          sessionUser?.id ||
          (session as any)?.token?.sub ||
          (session as any)?.account?.providerAccountId;

        const googleEmail = googleUser.email || sessionUser?.email;
        const profilePicture = googleUser.image || sessionUser?.image;

        if (!googleId || !googleEmail) {
          googleId = googleId || "temp_" + Date.now();
          if (!googleEmail) {
            alert("Tidak bisa mendapatkan email Google.");
            await signOut({ redirect: false });
            return;
          }
        }

        const response = await fetch("/api/auth/bind-google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ googleId, googleEmail, profilePicture }),
        });

        const result = await response.json();
        if (response.ok) {
          setUser(result.user);
          await signOut({ redirect: false });
          alert("Berhasil menghubungkan akun Google!");
        } else {
          alert(result.error || "Gagal menghubungkan");
          await signOut({ redirect: false });
        }
      } catch {
        alert("Terjadi kesalahan binding");
        await signOut({ redirect: false });
      } finally {
        setBindingGoogle(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (session?.user && isLoggedIn && user && !user.googleId) {
      handleGoogleBinding(session.user as any);
    }
  }, [session, isLoggedIn, user?.googleId, user, handleGoogleBinding]);

  // Ambil riwayat order setelah user confirmed login
  useEffect(() => {
    if (!isLoggedIn || !user?._id) return;
    setOrdersLoading(true);
    fetch(`/api/users/${user._id}/orders`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [isLoggedIn, user?._id]);

  const handleBindGoogle = () => {
    if (user?.googleId) return alert("Sudah terhubung.");
    signIn("google", { redirect: false, callbackUrl: "/profile" });
  };

  const handleUnbindGoogle = async () => {
    if (!user?.googleId) return alert("Belum terhubung.");
    if (!confirm("Yakin putuskan akun Google?")) return;
    try {
      setUnbindingGoogle(true);
      const res = await fetch("/api/auth/unbind-google", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        alert("Berhasil diputuskan.");
      } else {
        alert(result.error || "Gagal.");
      }
    } finally {
      setUnbindingGoogle(false);
    }
  };

  const handleLogout = async () => {
    try {
      // 1) Clear custom auth cookie on server (httpOnly)
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // 2) Sign out NextAuth session if present (safe to call regardless)
      await signOut({ redirect: false });

      // 3) Clear client-side storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch { }

      // 4) Redirect to login
      window.location.assign("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Force redirect even if there's an error
      window.location.assign("/login");
    }
  };

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400 via-sky-500 to-indigo-600 animate-pulse blur-sm opacity-60" />
          <div className="relative h-full w-full rounded-full bg-white/90 flex items-center justify-center text-xs font-medium text-gray-500 animate-pulse">
            Loading...
          </div>
        </div>
      </div>
    );
  if (!isLoggedIn) return <p className="p-6 text-center">Silakan login dulu.</p>;
  if (!user) return <p className="p-6 text-center">User tidak ditemukan.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* Header Card */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Profil Akun</h1>
            <p className="text-sm text-muted-foreground mt-1">Kelola identitas & keterhubungan akun Anda.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="h-9 px-4 rounded-md border bg-white text-sm hover:bg-gray-50 shadow-sm"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="h-9 px-4 rounded-md bg-red-500 text-white text-sm font-medium shadow hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
          {/* Avatar + Social Actions */}
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-xl border bg-white shadow-sm flex flex-col items-center">
              <AvatarDisplay
                name={user.name}
                image={(user.profilePicture || (session?.user as any)?.image) as string | undefined}
                googleLinked={!!user.googleId}
              />
              <p className="mt-3 font-medium text-sm">{user.name}</p>
              <p className="text-[11px] text-gray-500 font-mono">@{user.username}</p>
              <div className="mt-4 w-full flex flex-col gap-2">
                {user.googleId ? (
                  <button
                    onClick={handleUnbindGoogle}
                    disabled={unbindingGoogle}
                    className="h-9 w-full rounded-md bg-orange-500 text-white text-xs font-medium shadow hover:bg-orange-600 disabled:opacity-50"
                  >
                    {unbindingGoogle ? "Memutus..." : "Putuskan Google"}
                  </button>
                ) : (
                  <button
                    onClick={handleBindGoogle}
                    disabled={bindingGoogle}
                    className="h-9 w-full rounded-md bg-blue-600 text-white text-xs font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                  >
                    {bindingGoogle ? "Menghubungkan..." : "Hubungkan Google"}
                  </button>
                )}
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold tracking-wide">Status Koneksi</h3>
              <div className="flex items-center gap-2 text-sm">
                {user.googleId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-[11px] font-medium">Terhubung Google</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-[11px] font-medium">Belum Terhubung</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Menghubungkan akun memudahkan login cepat dan sinkronisasi avatar.</p>
            </div>
          </div>

          {/* Information Card */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <Info label="Nama" value={user.name} />
              <Info label="Username">
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block">
                  {user.username}
                </span>
              </Info>
              <Info label="Role">
                <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${user.role === 'admin'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{user.role || 'user'}</span>
              </Info>
              <Info label="Google Email" value={user.googleEmail || '-'} />
              <Info label="Dibuat" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'} />
              <Info label="Diperbarui" value={user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('id-ID') : '-'} />
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Riwayat Pembelian</h2>
          <span className="text-xs text-muted-foreground">{orders.length} order</span>
        </div>
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="relative">
            <div className="max-h-[460px] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-600 border-b">
                  <tr>
                    <th className="py-3 px-3 font-semibold">Tanggal</th>
                    <th className="py-3 px-3 font-semibold">Order ID</th>
                    <th className="py-3 px-3 font-semibold">Produk</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold">Payment</th>
                    <th className="py-3 px-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">Memuat riwayat...</td>
                    </tr>
                  )}
                  {!ordersLoading && !orders.length && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">Belum ada riwayat pembelian.</td>
                    </tr>
                  )}
                  {!ordersLoading && orders.map(o => {
                    const date = new Date(o.createdAt);
                    const formatted = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                    const itemsLabel = o.items.map(it => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ''}`).join(', ');
                    const orderId = o.midtransOrderId || o.id || '-';
                    const statusBadge = badgeColor(o.status);
                    const paymentBadge = o.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-red-100 text-red-700 border border-red-200';
                    return (
                      <tr key={orderId} className="border-b last:border-b-0 hover:bg-gray-50/60">
                        <td className="py-3 px-3 whitespace-nowrap text-gray-600 text-xs">{formatted}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-500">{orderId.toString().slice(-16)}</td>
                        <td className="py-3 px-3 max-w-[280px]">
                          <p className="truncate text-xs" title={itemsLabel}>{itemsLabel}</p>
                        </td>
                        <td className="py-3 px-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${statusBadge}`}>{o.status}</span></td>
                        <td className="py-3 px-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${paymentBadge}`}>{o.paymentStatus}</span></td>
                        <td className="py-3 px-3 text-right font-medium tabular-nums text-xs">{formatIDR(o.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, children }: { label: string; value?: any; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      {children ? <div>{children}</div> : <p className="font-medium break-all">{value ?? "-"}</p>}
    </div>
  );
}

// Avatar with gradient fallback & hover ring effect
function AvatarDisplay({
  name,
  image,
  googleLinked,
}: {
  name: string;
  image?: string;
  googleLinked: boolean;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const gradient = useMemo(() => {
    const palette = [
      "from-violet-500 via-indigo-500 to-sky-500",
      "from-emerald-500 via-teal-500 to-cyan-500",
      "from-fuchsia-500 via-pink-500 to-rose-500",
      "from-amber-500 via-orange-500 to-rose-500",
      "from-sky-500 via-blue-500 to-indigo-500",
    ];
    const idx = initial.charCodeAt(0) % palette.length;
    return palette[idx];
  }, [initial]);

  return (
    <div className="relative group">
      <div className="relative h-40 w-40">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-40 w-40 rounded-full object-cover ring-4 ring-white shadow-sm outline outline-gray-200 group-hover:outline-emerald-400 transition"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = (e.currentTarget.parentElement?.querySelector(
                '[data-fallback-avatar]'
              ) as HTMLElement) as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          data-fallback-avatar
          className={`absolute inset-0 ${image ? 'hidden' : 'flex'
            } items-center justify-center rounded-full text-white text-6xl font-semibold bg-gradient-to-br ${gradient} shadow-sm ring-4 ring-white select-none`}
        >
          {initial}
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-emerald-400/60 transition" />
        {googleLinked && (
          <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full shadow-md">
            Google
          </span>
        )}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-black/30 flex items-center justify-center gap-2 text-[10px] font-medium text-white backdrop-blur-sm transition">
          <span className="px-2 py-1 bg-white/20 rounded-md">Avatar</span>
        </div>
      </div>
    </div>
  );
}

// Simple Rupiah formatter (fallback jika Intl tidak support)
function formatIDR(value: number) {
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
  } catch {
    return `Rp ${value.toLocaleString("id-ID")}`;
  }
}

// Provide consistent badge coloring for order status
function badgeColor(status: string) {
  switch (status) {
    case 'Pending': return 'bg-gray-100 text-gray-700 border border-gray-200';
    case 'Diproses': return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'Dikirim': return 'bg-amber-100 text-amber-700 border border-amber-300';
    case 'Selesai': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'Dibatalkan': return 'bg-red-100 text-red-700 border border-red-200';
    default: return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
}