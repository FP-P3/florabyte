"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast, { Toaster } from "react-hot-toast";

interface OrderItemSnapshot { productId: string; name: string; price: number; qty: number; }
interface AdminOrder {
    id: string;
    userId: string;
    userName?: string;
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
            <h1 className="text-2xl font-semibold">Manajemen Orders</h1>
            <div className="flex flex-wrap gap-3 items-center text-sm">
                <button onClick={fetchAll} className="px-3 py-1.5 rounded bg-gray-800 text-white text-xs hover:bg-black">Refresh</button>
                <a href="/cms/products" className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition">CMS Products</a>
                {loading && <span className="text-gray-500">Memuat...</span>}
                {message && <span className="text-green-600">{message}</span>}
                {error && <span className="text-red-600">{error}</span>}
            </div>
            <div className="overflow-auto border rounded-md bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-[11px] uppercase tracking-wide text-gray-600">
                        <tr>
                            <th className="py-2 px-3 text-left">Order ID</th>
                            <th className="py-2 px-3 text-left">User</th>
                            <th className="py-2 px-3 text-left">Items</th>
                            <th className="py-2 px-3 text-left">Total</th>
                            <th className="py-2 px-3 text-left">Payment</th>
                            <th className="py-2 px-3 text-left">Status</th>
                            <th className="py-2 px-3 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Memuat...</td></tr>
                        )}
                        {!loading && !orders.length && (
                            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Tidak ada orders.</td></tr>
                        )}
                        {!loading && orders.map(o => {
                            const itemsLabel = o.items.map(it => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ''}`).join(', ');
                            return (
                                <tr key={o.id} className="border-t">
                                    <td className="py-2 px-3 font-mono text-[11px]">{o.id.slice(-12)}</td>
                                    <td className="py-2 px-3 text-[11px]">{o.userName || o.userId.slice(-8)}</td>
                                    <td className="py-2 px-3 max-w-[240px]">
                                        <p className="truncate" title={itemsLabel}>{itemsLabel}</p>
                                    </td>
                                    <td className="py-2 px-3 tabular-nums">{formatIDR(o.total)}</td>
                                    <td className="py-2 px-3">{o.paymentStatus || 'paid'}</td>
                                    <td className="py-2 px-3">{o.status}</td>
                                    <td className="py-2 px-3">
                                        <Select disabled={updatingId === o.id} onValueChange={(val: string) => updateStatus(o.id, val)} value={o.status}>
                                            <SelectTrigger className="w-[140px] h-8 text-xs">
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
