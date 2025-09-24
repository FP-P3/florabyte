"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast, { Toaster } from "react-hot-toast";

interface OrderItemSnapshot { productId: string; name: string; price: number; qty: number; }
interface AdminOrder {
    id: string;
    userId: string;
    userName?: string;
    userPhone?: string | null;
    userAddress?: string | null;
    items: OrderItemSnapshot[];
    total: number;
    status: string; // orderStatus
    paymentStatus?: string; // paid | cancelled
    midtransOrderId?: string;
    createdAt: string;
    updatedAt: string;
}

const STATUS_OPTIONS = ["Pending", "Diproses", "Dikirim", "Selesai", "Dibatalkan"];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [, setError] = useState<string | null>(null); // internal error state (not displayed yet)

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/orders", { cache: "no-store" });
            if (!res.ok) throw new Error("Gagal memuat orders");
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Gagal memuat orders';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchAll(); }, []);

    async function updateStatus(id: string, status: string) {
        const prev = orders;
        setUpdatingId(id);
    // clear transient message (not currently displayed)
        // Optimistic UI (optional)
        setOrders(p => p.map(o => o.id === id ? { ...o, status } : o));
        try {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            let data: { order?: unknown; error?: string } = {};
            try { data = await res.json(); } catch { /* ignore */ }
            if (!res.ok || !data.order) {
                // rollback
                setOrders(prev);
                throw new Error(data.error || `Gagal update (status ${res.status})`);
            }
            toast.success("Status diperbarui");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Gagal update';
            toast.error(msg);
            setError(msg);
        } finally {
            setUpdatingId(null);
        }
    }

    return (
        <div className="p-6 space-y-4">
            <Toaster position="top-right" />
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Manajemen Orders</h1>
                    <p className="text-sm text-muted-foreground mt-1">Kelola status dan pantau detail pesanan.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-stretch rounded-md border bg-white shadow-sm overflow-hidden">
                        <button
                            onClick={fetchAll}
                            className="h-9 px-3 text-sm hover:bg-gray-50 flex items-center gap-2"
                            title="Muat ulang daftar"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-8.9 3h-2.1A7 7 0 1 0 19 12c0-1.61-.59-3.09-1.35-4.65z" fill="currentColor" /></svg>
                            Refresh
                        </button>
                        <a
                            href="/cms/products"
                            className="h-9 px-3 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 border-l"
                            title="Buka CMS Products"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" fill="currentColor" /><path d="M5 5h7v2H7v10h10v-5h2v7H5V5z" fill="currentColor" /></svg>
                            CMS Products
                        </a>
                    </div>
                </div>
            </div>
            <div className="overflow-auto border rounded-xl bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur text-[11px] uppercase tracking-wide text-gray-600 border-b">
                        <tr>
                            <th className="py-3.5 px-4 text-left">Order ID</th>
                            <th className="py-3.5 px-4 text-left">User</th>
                            <th className="py-3.5 px-4 text-left">Items</th>
                            <th className="py-3.5 px-4 text-left">Total</th>
                            <th className="py-3.5 px-4 text-left">Payment</th>
                            <th className="py-3.5 px-4 text-left">Status</th>
                            <th className="py-3.5 px-4 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={7} className="py-10 text-center text-gray-500">Memuat...</td></tr>
                        )}
                        {!loading && !orders.length && (
                            <tr><td colSpan={7} className="py-10 text-center text-gray-500">Tidak ada orders.</td></tr>
                        )}
                        {!loading && orders.map(o => {
                            return (
                                <tr key={o.id} className="border-t odd:bg-white even:bg-gray-50/50 hover:bg-emerald-50/40">
                                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700">{o.id.slice(-12)}</td>
                                    <td className="py-3.5 px-4">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-medium">{o.userName || o.userId.slice(-8)}</p>
                                            {(o.userPhone || o.userAddress) && (
                                                <p className="text-xs text-gray-600 line-clamp-1">
                                                    {o.userPhone ? `${o.userPhone}` : ''}
                                                    {o.userPhone && o.userAddress ? ' • ' : ''}
                                                    {o.userAddress ? `${o.userAddress}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 align-top">
                                        <div className="flex flex-wrap gap-1.5">
                                            {o.items.map((it, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border bg-gray-50 text-gray-700 border-gray-200"
                                                    title={`${it.name}${it.qty > 1 ? ` x${it.qty}` : ''}`}
                                                >
                                                    <span className="truncate max-w-[180px]" title={it.name}>{it.name}</span>
                                                    {it.qty > 1 && <span className="text-gray-500">×{it.qty}</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 tabular-nums">{formatIDR(o.total)}</td>
                                    <td className="py-3.5 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{o.paymentStatus || 'paid'}</span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${badgeColor(o.status)}`}>{o.status}</span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <Select disabled={updatingId === o.id} onValueChange={(val: string) => updateStatus(o.id, val)} value={o.status}>
                                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function formatIDR(value: number) {
    try { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value); } catch { return `Rp ${value.toLocaleString("id-ID")}`; }
}

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
