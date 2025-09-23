"use client";

import { useState, useEffect, FormEvent, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Image from "next/image";

const CATEGORY_OPTIONS = ["tools", "pesticide", "fertilizer", "soil"] as const;

type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export default function CMSProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // Query untuk fetch
  const [searchInput, setSearchInput] = useState(""); // Input field
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    imgUrl: "",
    category: "",
  });
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  type SortKey = "name" | "price" | "stock" | "category" | "createdAt";
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchProducts = useCallback(async () => {
    try {
      const query = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/products${query}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]); // Trigger fetch saat search berubah

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const sortedProducts = useMemo(() => {
    const arr = [...products];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const getVal = (p: Product, key: SortKey) => {
        switch (key) {
          case "name":
          case "category":
            return (p[key] || "").toString().toLowerCase();
          case "price":
          case "stock":
            return Number(p[key] || 0);
          case "createdAt":
            return new Date(p.createdAt).getTime();
        }
      };
      const va = getVal(a, sortBy);
      const vb = getVal(b, sortBy);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [products, sortBy, sortDir]);

  const total = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, page]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const renderSort = (key: SortKey) => (
    <span className="ml-1 text-gray-400">
      {sortBy === key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const truncate = (text: string, max = 100) =>
    text && text.length > max ? `${text.slice(0, max)}…` : text;

  const handleSearch = () => {
    setSearch(searchInput); // Set query dari input
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setUploading(true);
      // Prepare payload from current form state
      const payload = { ...formData };
      // If a new file is selected, upload it first to get URL
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const upRes = await fetch("/api/admin/products/upload", {
          method: "POST",
          body: fd,
        });
        if (!upRes.ok) throw new Error("Image upload failed");
        const upJson = await upRes.json();
        payload.imgUrl = upJson.url;
      }

      const method = editingProduct ? "PUT" : "POST";
      const url = editingProduct
        ? `/api/admin/products/${editingProduct._id}`
        : "/api/admin/products";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save product");
      fetchProducts();
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        imgUrl: "",
        category: "",
      });
      setImageFile(null);
      setImagePreview("");
      toast.success(
        editingProduct
          ? "Product updated successfully"
          : "Product added successfully"
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const isCategoryOption = (
    val: string
  ): val is (typeof CATEGORY_OPTIONS)[number] => {
    return (CATEGORY_OPTIONS as readonly string[]).includes(val);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imgUrl: product.imgUrl,
      category: isCategoryOption(product.category) ? product.category : "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete product");
        fetchProducts();
        toast.success("Product deleted successfully");
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
  };

  if (loading) return (
    <div className="p-8 flex flex-col gap-6">
      <div className="h-8 w-56 rounded-md bg-gray-200 animate-pulse" />
      <div className="h-12 rounded-xl border bg-white shadow-sm flex items-center gap-4 px-4">
        <div className="h-9 w-64 max-w-full rounded-md bg-gray-100 animate-pulse" />
        <div className="h-9 w-28 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-9 w-32 rounded-md bg-gray-100 animate-pulse" />
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[220px_1fr_100px_80px_120px_90px_120px] gap-4 px-6 py-4 border-b last:border-b-0">
            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 w-16 bg-gray-100 rounded-md animate-pulse" />
            <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">CMS Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola katalog produk: tambah, edit, hapus, dan cari.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Cari nama / kategori..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              className="w-full sm:w-72 h-10 rounded-md border bg-white px-3 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSearch}
              className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 text-sm"
            >Cari</button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-700 transition"
          >Tambah</button>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600 border-b">
            <tr>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort('name')}>Nama {renderSort('name')}</th>
              <th className="px-4 py-3 text-left">Deskripsi</th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort('price')}>Harga {renderSort('price')}</th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort('stock')}>Stok {renderSort('stock')}</th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort('category')}>Kategori {renderSort('category')}</th>
              <th className="px-4 py-3 text-left">Gambar</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500">Tidak ada produk.</td>
              </tr>
            ) : pagedProducts.map(product => (
              <tr key={product._id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[26rem]">
                  <p className="truncate" title={product.description}>{truncate(product.description, 120)}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">Rp {product.price.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3 capitalize">
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">{product.category}</span>
                </td>
                <td className="px-4 py-3">
                  <Image src={product.imgUrl} alt={product.name} width={56} height={56} className="h-14 w-14 object-cover rounded-md ring-1 ring-gray-200" />
                </td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(product)}
                    className="inline-flex h-8 items-center rounded-md bg-amber-500 px-3 text-xs font-medium text-white shadow hover:bg-amber-600"
                  >Edit</button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="inline-flex h-8 items-center rounded-md bg-red-500 px-3 text-xs font-medium text-white shadow hover:bg-red-600"
                  >Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
        <div>
          {total > 0 ? (
            <span>Menampilkan {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} dari {total}</span>
          ) : (
            <span>Menampilkan 0 dari 0</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-8 px-3 rounded-md border bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40"
          >Prev</button>
          <span className="font-medium">Hal {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-8 px-3 rounded-md border bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40"
          >Next</button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl ring-1 ring-black/5 flex flex-col animate-in fade-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-100/40">
              <h2 className="text-lg font-semibold tracking-tight">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <button
                onClick={() => { setShowModal(false); setEditingProduct(null); resetForm(); }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <Field label="Nama">
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full h-10 rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Nama produk"
                />
              </Field>
              <Field label="Deskripsi">
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 h-28 resize-none"
                  placeholder="Deskripsi singkat produk"
                />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Harga (Rp)">
                  <input
                    type="number"
                    min={0}
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Math.max(0, Number(e.target.value || 0)) })}
                    required
                    className="w-full h-10 rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="100000"
                  />
                </Field>
                <Field label="Stok">
                  <input
                    type="number"
                    min={0}
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: Math.max(0, Number(e.target.value || 0)) })}
                    required
                    className="w-full h-10 rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="50"
                  />
                </Field>
              </div>
              <Field label="Gambar Produk">
                <div className="space-y-3">
                  {(imagePreview || formData.imgUrl) && (
                    <Image src={imagePreview || formData.imgUrl} alt={formData.name || 'preview'} width={180} height={180} className="h-40 w-40 object-cover rounded-lg ring-1 ring-gray-200" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) { const reader = new FileReader(); reader.onload = () => setImagePreview(reader.result as string); reader.readAsDataURL(f); } else { setImagePreview(''); }
                    }}
                    className="w-full text-xs"
                  />
                  <p className="text-[11px] text-gray-500">Format: JPG, PNG, WEBP (maks ~5MB)</p>
                </div>
              </Field>
              <Field label="Kategori">
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full h-10 rounded-md border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 capitalize"
                >
                  <option value="" disabled>Pilih kategori</option>
                  {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </Field>
            </form>
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50/80">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingProduct(null); resetForm(); }}
                className="h-10 flex-1 rounded-md border bg-white text-sm font-medium shadow-sm hover:bg-gray-50"
              >Batal</button>
              <button
                onClick={(e) => { (e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement)?.requestSubmit(); }}
                disabled={uploading}
                className="h-10 flex-1 rounded-md bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-700 disabled:opacity-50"
              >{uploading ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold tracking-wide text-gray-600 space-y-1">
      <span className="uppercase">{label}</span>
      <div>{children}</div>
    </label>
  )
}

function resetForm() {
  // helper to reset form state (called inside component scope by reference binding)
}