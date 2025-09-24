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
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/orders", { cache: "no-store" });
            if (!res.ok) throw new Error("Gagal memuat orders");
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchAll(); }, []);

    async function updateStatus(id: string, status: string) {
        const prev = orders;
        setUpdatingId(id);
        setMessage(null);
        // Optimistic UI (optional)
        setOrders(p => p.map(o => o.id === id ? { ...o, status } : o));
        try {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            let data: any = {};
            try { data = await res.json(); } catch { }
            if (!res.ok || !data?.order) {
                // rollback
                setOrders(prev);
                throw new Error(data.error || `Gagal update (status ${res.status})`);
            }
            toast.success("Status diperbarui");
        } catch (e: any) {
            toast.error(e.message || 'Gagal update');
            setError(e.message);
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
                <div className="flex flex-wrap gap-2 items-center text-sm">
                    <button onClick={fetchAll} className="h-9 px-4 rounded-md border bg-white hover:bg-gray-50 shadow-sm text-sm">Refresh</button>
                    <a href="/cms/products" className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-700 transition">CMS Products</a>
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
                            const itemsLabel = o.items.map(it => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ''}`).join(', ');
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
                                    <td className="py-3.5 px-4 max-w-[360px]">
                                        <p className="truncate" title={itemsLabel}>{itemsLabel}</p>
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
