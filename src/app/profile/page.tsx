"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

interface User {
  _id: string;
  name: string;
  username: string;
  email?: string | null;
  role?: string | null;
  googleId?: string | null;
  googleEmail?: string | null;
  profilePicture?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// Order types at module scope for reuse
export interface OrderHistoryItem {
  id: string;
  midtransOrderId?: string;
  status: "Pending" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan"; // orderStatus
  paymentStatus: "paid" | "cancelled";
  total: number;
  createdAt: string;
  updatedAt?: string;
  items: { productId: string; name: string; price: number; qty: number }[];
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    address: "",
  });
  const [statusFilter, setStatusFilter] = useState<
    "Semua" | "Pending" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan"
  >("Semua");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderHistoryItem | null>(null);

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
        setForm({
          name: data.name || "",
          username: data.username || "",
          phone: data.phone || "",
          address: data.address || "",
        });
      })
      .catch((err) => {
        console.warn("Failed loading /api/auth/me", err);
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  // Sync form when user changes (e.g., after PATCH success)
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      username: user.username || "",
      phone: user.phone || "",
      address: user.address || "",
    });
  }, [user]);

  const handleGoogleBinding = useCallback(
    async (googleUser: {
      id?: string | null;
      sub?: string | null;
      email?: string | null;
      image?: string | null;
    }) => {
      try {
        setBindingGoogle(true);
        const sessionUser = session?.user;
        let googleId = googleUser.id || googleUser.sub || undefined;
        const googleEmail = googleUser.email || sessionUser?.email || null;
        const profilePicture =
          googleUser.image ||
          (typeof sessionUser?.image === "string" ? sessionUser.image : null);

        if (!googleId || !googleEmail) {
          googleId = googleId || "temp_" + Date.now();
          if (!googleEmail) {
            toast.error("Tidak bisa mendapatkan email Google.");
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
          toast.success("Berhasil menghubungkan akun Google!");
        } else {
          toast.error(result.error || "Gagal menghubungkan");
          await signOut({ redirect: false });
        }
      } catch {
        toast.error("Terjadi kesalahan binding");
        await signOut({ redirect: false });
      } finally {
        setBindingGoogle(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (session?.user && isLoggedIn && user && !user.googleId) {
      const su = session.user;
      handleGoogleBinding({
        id: undefined,
        sub: undefined,
        email: su.email ?? null,
        image: typeof su.image === "string" ? su.image : null,
      });
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

  // Small helper to copy text and notify
  const copyText = useCallback((text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => toast.success("Order ID disalin"));
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("Order ID disalin");
      }
    } catch {
      toast.error("Tidak dapat menyalin");
    }
  }, []);

  // Stats & filtered orders
  const { totalOrders, cancelledOrders, totalSpent } = useMemo(() => {
    const totalOrders = orders.length;
    const cancelledOrders = orders.filter(
      (o) => o.status === "Dibatalkan"
    ).length;
    const totalSpent = orders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((acc, o) => acc + (o.total || 0), 0);
    return { totalOrders, cancelledOrders, totalSpent };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "Semua") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const handleBindGoogle = () => {
    if (user?.googleId) return toast("Sudah terhubung.");
    signIn("google", { redirect: false, callbackUrl: "/profile" });
  };

  const handleUnbindGoogle = async () => {
    if (!user?.googleId) return toast("Belum terhubung.");
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
        toast.success("Berhasil diputuskan.");
      } else {
        toast.error(result.error || "Gagal.");
      }
    } finally {
      setUnbindingGoogle(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (!confirm("Yakin ingin logout sekarang?")) return;
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
      } catch {}

      // 4) Redirect to login
      window.location.assign("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Force redirect even if there's an error
      window.location.assign("/login");
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!form.name.trim() || !form.username.trim()) {
        toast.error("Nama dan username wajib diisi");
        return;
      }
      if (form.username.trim().length < 3) {
        toast.error("Username minimal 3 karakter");
        return;
      }
      setSaving(true);
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username.trim(),
          phone: form.phone?.trim() || "",
          address: form.address?.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan profil");
      setUser(data);
      setEditing(false);
      toast.success("Profil disimpan");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      toast.error(msg);
    } finally {
      setSaving(false);
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
  if (!isLoggedIn)
    return <p className="p-6 text-center">Silakan login dulu.</p>;
  if (!user) return <p className="p-6 text-center">User tidak ditemukan.</p>;

  return (
    <div className="relative max-w-5xl mx-auto p-6 space-y-10">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-56 w-[80%] max-w-5xl rounded-[48px] bg-gradient-to-tr from-emerald-200 via-sky-200 to-transparent blur-3xl opacity-60 -z-10" />
      <Toaster position="top-right" />
      {/* Header Card */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Profil Akun
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola identitas & keterhubungan akun Anda.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {!editing ? (
              <>
                {/* Primary and secondary grouped */}
                <div className="inline-flex items-stretch rounded-md border bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setEditing(true)}
                    className="h-9 px-3 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-2"
                    title="Edit profil"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-90"
                    >
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                        fill="currentColor"
                      />
                    </svg>
                    Edit Profil
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="h-9 px-3 text-sm hover:bg-gray-50 border-l flex items-center gap-2"
                    title="Muat ulang halaman"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-gray-600"
                    >
                      <path
                        d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-8.9 3h-2.1A7 7 0 1 0 19 12c0-1.61-.59-3.09-1.35-4.65z"
                        fill="currentColor"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>
                {/* Destructive separated */}
                <button
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-md border border-red-500 text-red-600 bg-white hover:bg-red-50 text-sm font-medium shadow-sm flex items-center gap-2"
                  title="Keluar akun"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-red-600"
                  >
                    <path
                      d="M10 17l5-5-5-5v3H3v4h7v3zm9-14H11a2 2 0 0 0-2 2v3h2V5h8v14h-8v-3H9v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
                      fill="currentColor"
                    />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="inline-flex items-stretch rounded-md border bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        name: user!.name,
                        username: user!.username,
                        phone: user!.phone || "",
                        address: user!.address || "",
                      });
                    }}
                    className="h-9 px-3 text-sm hover:bg-gray-50 flex items-center gap-2"
                    title="Batalkan perubahan"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-gray-600"
                    >
                      <path d="M19 13H5v-2h14v2z" fill="currentColor" />
                    </svg>
                    Batal
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="h-9 px-3 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    title="Simpan perubahan"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-90"
                    >
                      <path
                        d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5L9 16.2z"
                        fill="currentColor"
                      />
                    </svg>
                    {saving ? "Menyimpan…" : "Simpan"}
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-md border border-red-500 text-red-600 bg-white hover:bg-red-50 text-sm font-medium shadow-sm flex items-center gap-2"
                  title="Keluar akun"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-red-600"
                  >
                    <path
                      d="M10 17l5-5-5-5v3H3v4h7v3zm9-14H11a2 2 0 0 0-2 2v3h2V5h8v14h-8v-3H9v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
                      fill="currentColor"
                    />
                  </svg>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
          {/* Avatar + Social Actions */}
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-xl border bg-white shadow-sm flex flex-col items-center">
              <AvatarDisplay
                name={user.name}
                image={
                  (typeof user.profilePicture === "string" &&
                    user.profilePicture) ||
                  (typeof session?.user?.image === "string"
                    ? session.user.image
                    : undefined)
                }
                googleLinked={!!user.googleId}
              />
              <p className="mt-3 font-medium text-sm">{user.name}</p>
              <p className="text-[11px] text-gray-500 font-mono">
                @{user.username}
              </p>
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
              <h3 className="text-sm font-semibold tracking-wide">
                Status Koneksi
              </h3>
              <div className="flex items-center gap-2 text-sm">
                {user.googleId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-[11px] font-medium">
                    Terhubung Google
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-[11px] font-medium">
                    Belum Terhubung
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Menghubungkan akun memudahkan login cepat dan sinkronisasi
                avatar.
              </p>
            </div>
          </div>

          {/* Information / Edit Card */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {!editing ? (
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <Info label="Nama" value={user.name} />
                <Info label="Username">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 inline-block">
                      @{user.username}
                    </span>
                    <button
                      onClick={() => copyText(user.username)}
                      className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 text-gray-600"
                    >
                      Salin
                    </button>
                  </div>
                </Info>
                <Info label="Nomor Telepon" value={user.phone || "-"} />
                <Info label="Alamat" value={user.address || "-"} />
                <Info label="Google Email">
                  {user.googleEmail ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{user.googleEmail}</span>
                      <button
                        onClick={() => copyText(user.googleEmail!)}
                        className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 text-gray-600"
                      >
                        Salin
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </Info>
                <Info
                  label="Dibuat"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("id-ID")
                      : "-"
                  }
                />
                <Info
                  label="Diperbarui"
                  value={
                    user.updatedAt
                      ? new Date(user.updatedAt).toLocaleDateString("id-ID")
                      : "-"
                  }
                />
              </div>
            ) : (
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-gray-500">
                    Nama
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-gray-500">
                    Username
                  </label>
                  <input
                    value={form.username}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, username: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-gray-500">
                    Nomor Telepon
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="0812xxxxxxx"
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] uppercase tracking-wide text-gray-500">
                    Alamat
                  </label>
                  <textarea
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="md:col-span-2 text-[11px] text-gray-500">
                  Kamu dapat mengosongkan nomor telepon/alamat untuk
                  menghapusnya.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Order"
          value={totalOrders.toString()}
          accent="from-emerald-500/10 to-emerald-500/0"
        />
        <StatCard
          title="Dibatalkan"
          value={cancelledOrders.toString()}
          accent="from-amber-500/10 to-amber-500/0"
        />
        <StatCard
          title="Total Pembelian"
          value={formatIDR(totalSpent)}
          accent="from-sky-500/10 to-sky-500/0"
        />
      </section>

      {/* Order History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Riwayat Pembelian
            </h2>
            <div className="hidden md:block text-xs text-muted-foreground">
              •
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredOrders.length} order
            </span>
          </div>
          {/* Status filter chips */}
          <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
            {(
              [
                "Semua",
                "Pending",
                "Diproses",
                "Dikirim",
                "Selesai",
                "Dibatalkan",
              ] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`h-8 px-3 rounded-full border text-xs transition ${
                  statusFilter === s
                    ? "bg-emerald-600 text-white border-emerald-600 shadow"
                    : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="relative">
            <div className="max-h-[460px] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur text-left text-[11px] uppercase tracking-wide text-gray-600 border-b">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      Tanggal
                    </th>
                    <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      Order ID
                    </th>
                    <th className="py-3.5 px-4 font-semibold">Produk</th>
                    <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      STATUS ORDER
                    </th>
                    <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      Payment
                    </th>
                    <th className="py-3.5 px-4 text-right font-semibold whitespace-nowrap">
                      Total
                    </th>
                    <th className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-gray-500 text-sm"
                      >
                        Memuat riwayat...
                      </td>
                    </tr>
                  )}
                  {!ordersLoading && !filteredOrders.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-gray-500 text-sm"
                      >
                        Belum ada riwayat pembelian.
                      </td>
                    </tr>
                  )}
                  {!ordersLoading &&
                    filteredOrders.map((o) => {
                      const date = new Date(o.createdAt);
                      const formatted = date.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const itemsLabel = o.items
                        .map(
                          (it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ""}`
                        )
                        .join(", ");
                      const orderId = o.midtransOrderId || o.id || "-";
                      const statusBadge = badgeColor(o.status);
                      const paymentBadge =
                        o.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-red-100 text-red-700 border border-red-200";
                      return (
                        <tr
                          key={orderId}
                          className="group border-b last:border-b-0 odd:bg-white even:bg-gray-50/50 hover:bg-emerald-50/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 text-xs">
                            {formatted}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5 border border-gray-200">
                                {orderId.toString().slice(-16)}
                              </span>
                              {orderId !== "-" && (
                                <button
                                  onClick={() => copyText(orderId.toString())}
                                  className="opacity-0 group-hover:opacity-100 transition text-[10px] px-2 py-1 rounded border bg-white hover:bg-gray-50 text-gray-600"
                                  title="Salin Order ID"
                                >
                                  Salin
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-[340px]">
                            <p className="truncate text-xs" title={itemsLabel}>
                              {itemsLabel}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${statusBadge}`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${paymentBadge}`}
                            >
                              {o.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-xs text-gray-800">
                            {formatIDR(o.total)}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => {
                                setDetailOrder(o);
                                setDetailOpen(true);
                              }}
                              className="text-[11px] px-2 py-1 rounded border bg-white hover:bg-gray-50 text-gray-700"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <OrderDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={detailOrder}
      />
    </div>
  );
}

function Info({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null | undefined;
  children?: React.ReactNode;
}) {
  const rendered =
    children ??
    (value === null || value === undefined || value === "" ? (
      <span className="text-gray-500">-</span>
    ) : (
      value
    ));
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="font-medium break-all text-sm">{rendered}</div>
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
          <Image
            src={image}
            alt={name}
            width={160}
            height={160}
            className="h-40 w-40 rounded-full object-cover ring-4 ring-white shadow-sm outline outline-gray-200 group-hover:outline-emerald-400 transition"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.parentElement?.querySelector(
                "[data-fallback-avatar]"
              ) as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          data-fallback-avatar
          className={`absolute inset-0 ${
            image ? "hidden" : "flex"
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

// Order Detail Modal using non-blocking overlay
function OrderDetailModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: OrderHistoryItem | null;
}) {
  if (!open || !order) return null;
  const orderId = order.midtransOrderId || order.id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-white shadow-xl">
        <div className="p-5 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Detail Pembelian</h3>
              <p className="text-xs text-gray-600 mt-1">
                Order: <span className="font-mono">{orderId}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase text-gray-500">
                Status Order
              </p>
              <p className="font-medium">{order.status}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500">Payment</p>
              <p className="font-medium">{order.paymentStatus}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-[11px] uppercase text-gray-500 mb-2">Penerima</p>
            <div className="text-sm grid gap-1">
              <p>
                <span className="text-gray-500">Nama:</span>{" "}
                {order.recipientName || "-"}
              </p>
              <p>
                <span className="text-gray-500">Telepon:</span>{" "}
                {order.recipientPhone || "-"}
              </p>
              <p>
                <span className="text-gray-500">Alamat:</span>{" "}
                {order.recipientAddress || "-"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase text-gray-500 mb-2">Items</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white border-b text-left">
                  <tr>
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3 w-16">Qty</th>
                    <th className="py-2 px-3 text-right">Harga</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr
                      key={`${it.productId}-${it.name}`}
                      className="odd:bg-white even:bg-gray-50"
                    >
                      <td className="py-2 px-3">{it.name}</td>
                      <td className="py-2 px-3">{it.qty}</td>
                      <td className="py-2 px-3 text-right">
                        {formatIDR(it.price)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatIDR(it.price * it.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2 px-3" colSpan={3}>
                      <span className="font-medium">Total</span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {formatIDR(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-md border bg-white hover:bg-gray-50 text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple Rupiah formatter (fallback jika Intl tidak support)
function formatIDR(value: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value);
  } catch {
    return `Rp ${value.toLocaleString("id-ID")}`;
  }
}

// Provide consistent badge coloring for order status
function badgeColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-gray-100 text-gray-700 border border-gray-200";
    case "Diproses":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "Dikirim":
      return "bg-amber-100 text-amber-700 border border-amber-300";
    case "Selesai":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "Dibatalkan":
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

// Small stat card component
function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="relative rounded-xl border bg-white p-5 shadow-sm overflow-hidden">
      {accent && (
        <div
          className={`pointer-events-none absolute inset-x-0 -top-10 h-24 bg-gradient-to-b ${accent}`}
        />
      )}
      <p className="text-[11px] uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
