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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">CMS Products</h1>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={handleSearch}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Search
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Product
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => toggleSort("name")}
                aria-sort={
                  sortBy === "name"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Name {renderSort("name")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Description
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => toggleSort("price")}
                aria-sort={
                  sortBy === "price"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Price {renderSort("price")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => toggleSort("stock")}
                aria-sort={
                  sortBy === "stock"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Stock {renderSort("stock")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => toggleSort("category")}
                aria-sort={
                  sortBy === "category"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                Category {renderSort("category")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Image
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pagedProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              pagedProducts.map((product) => (
                <tr
                  key={product._id}
                  className="odd:bg-white even:bg-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[28rem]">
                    <span
                      title={product.description}
                      aria-label={product.description}
                    >
                      {truncate(product.description, 100)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    Rp {product.price.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {product.stock}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <Image
                      src={product.imgUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-md ring-1 ring-gray-200"
                      width={64}
                      height={64}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(product)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <div>
          {total > 0 ? (
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)} of {total}
            </span>
          ) : (
            <span>Showing 0 of 0</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          {" "}
          {/* Transparan dengan blur */}
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 relative">
            <button
              onClick={() => {
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
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>
            {/* Update Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Product name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Product description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (in Rupiah)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 100000"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: Math.max(0, Number(e.target.value || 0)),
                    })
                  }
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 50"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: Math.max(0, Number(e.target.value || 0)),
                    })
                  }
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image
                </label>
                <div className="space-y-2">
                  {imagePreview || formData.imgUrl ? (
                    <Image
                      src={imagePreview || formData.imgUrl}
                      alt={formData.name || "preview"}
                      width={160}
                      height={160}
                      className="w-40 h-40 object-cover rounded border"
                    />
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = () =>
                          setImagePreview(reader.result as string);
                        reader.readAsDataURL(f);
                      } else {
                        setImagePreview("");
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    JPG, PNG, or WEBP up to ~5MB
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="capitalize">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {uploading ? "Uploading…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
