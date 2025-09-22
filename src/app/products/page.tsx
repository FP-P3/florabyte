"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ProductCard from "@/components/ProductCard";

type Product = any;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;
  const [loading, setLoading] = useState(false);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchProducts();
    // reset ke page 1 jika filter berubah (kecuali saat hanya ganti page)
  }, [selectedCategory, debouncedSearch, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set("q", debouncedSearch);
      if (selectedCategory) qs.set("category", selectedCategory);
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      const url = `/api/products?${qs.toString()}`;

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed ${response.status}`);
      const data = await response.json();
      setProducts(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      // Jika page > pages (misal setelah filter berubah), kembalikan ke 1
      if (page > (data.pages || 1)) setPage(1);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
      setProducts([]);
      setPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (response.ok) {
        toast.success("Product added to cart!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to add to cart.");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Something went wrong. Try again.");
    }
  };

  const categoryCards = [
    { key: "soil", label: "Soil", image: "/soils.webp" },
    { key: "fertilizer", label: "Fertilizer", image: "/fertilizer.webp" },
    { key: "pesticide", label: "Pesticide", image: "/pests.webp" },
    { key: "tools", label: "Tools", image: "/tools.webp" },
  ];

  const showingFrom = useMemo(
    () => (total === 0 ? 0 : (page - 1) * pageSize + 1),
    [page, total]
  );
  const showingTo = useMemo(
    () => Math.min(page * pageSize, total),
    [page, total]
  );

  return (
    <main className="min-h-screen page-bg-home text-foreground">
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Our Products
        </h1>

        {/* Search */}
        <div className="mx-auto mb-6 max-w-2xl">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products or categories..."
            className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category cards (tanpa All, wrap pakai grid) */}
        <div className="mx-auto max-w-5xl mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-1">
            {categoryCards.map((c) => {
              const active = selectedCategory === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={active}
                  data-active={active}
                  onClick={() => {
                    setSelectedCategory((prev) => (prev === c.key ? "" : c.key));
                    setPage(1);
                  }}
                  className={[
                    "group relative w-full h-44 md:h-52", // lebih tinggi agar muat ikon besar
                    "rounded-2xl bg-white border border-slate-200 shadow-[0_6px_20px_rgba(2,44,34,0.06)]",
                    "transition hover:shadow-[0_10px_28px_rgba(2,44,34,0.10)] hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    "data-[active=true]:ring-2 data-[active=true]:ring-emerald-600 data-[active=true]:ring-offset-2",
                  ].join(" ")}
                >
                  <div className="relative z-10 flex h-full w-full flex-col items-center justify-between py-4">
                    {/* Title di atas */}
                    <h3 className="text-slate-800 font-semibold text-lg md:text-xl tracking-tight">
                      {c.label}
                    </h3>

                    {/* Icon/logo besar di tengah */}
                    <img
                      src={c.image}
                      alt={c.label}
                      className="h-24 w-24 md:h-28 md:w-28 object-contain" // ikon dibesarkan
                    />
                  </div>

                  {/* Soft inner highlight */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.9),transparent_60%)]"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta */}
        <div className="mb-4 text-sm text-gray-600 text-center">
          {loading
            ? "Loading..."
            : `Showing ${showingFrom}-${showingTo} of ${total} items`}
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && !loading ? (
            <div className="col-span-full text-center text-gray-500">
              No products found.
            </div>
          ) : (
            products.map((product: any, index: number) => (
              <ProductCard
                key={product._id || index}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              className="px-3 py-2 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Prev
            </button>
            {Array.from({ length: pages }).map((_, i) => {
              const p = i + 1;
              const isActive = p === page;
              // show first, last, current±1
              if (
                p === 1 ||
                p === pages ||
                Math.abs(p - page) <= 1 ||
                (page <= 3 && p <= 5) ||
                (page >= pages - 2 && p >= pages - 4)
              ) {
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded border ${
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white hover:bg-gray-100"
                    }`}
                    disabled={loading}
                  >
                    {p}
                  </button>
                );
              }
              if (p === page - 2 || p === page + 2) {
                return (
                  <span key={`dots-${p}`} className="px-2">
                    …
                  </span>
                );
              }
              return null;
            })}
            <button
              className="px-3 py-2 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages || loading}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
