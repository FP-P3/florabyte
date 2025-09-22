"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Swal from 'sweetalert2'

type Product = {
  _id: string
  name: string
  description: string
  price: number
  stock: number
  imgUrl: string
  category: string
  createdAt: string
  updatedAt: string
}

export default function CMSProducts() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")  // Query untuk fetch
  const [searchInput, setSearchInput] = useState("")  // Input field
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    imgUrl: "",
    category: ""
  })
  const [uploading, setUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  useEffect(() => {
    fetchProducts()
  }, [search])  // Trigger fetch saat search berubah

  const fetchProducts = async () => {
    try {
      const query = search ? `?q=${encodeURIComponent(search)}` : ""
      const res = await fetch(`/api/admin/products${query}`)
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setSearch(searchInput)  // Set query dari input
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setUploading(true)
      const payload = { ...formData }
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        const upRes = await fetch('/api/admin/products/upload', { method: 'POST', body: fd })
        if (!upRes.ok) throw new Error('Image upload failed')
        const upJson = await upRes.json()
        payload.imgUrl = upJson.url
      }
      const method = editingProduct ? "PUT" : "POST"
      const url = editingProduct ? `/api/admin/products/${editingProduct._id}` : "/api/admin/products"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error("Failed to save product")
      fetchProducts()
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ name: "", description: "", price: 0, stock: 0, imgUrl: "", category: "" })
      setImageFile(null)
      setImagePreview("")
      toast.success(editingProduct ? "Product updated successfully" : "Product added successfully")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imgUrl: product.imgUrl,
      category: product.category
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete product")
        fetchProducts()
        toast.success("Product deleted successfully")
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
  }

  if (loading) return <div>Loading...</div>

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
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Name</th>
            <th className="border border-gray-300 p-2">Description</th>
            <th className="border border-gray-300 p-2">Price</th>
            <th className="border border-gray-300 p-2">Stock</th>
            <th className="border border-gray-300 p-2">Category</th>
            <th className="border border-gray-300 p-2">Image</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product._id}>
              <td className="border border-gray-300 p-2">{product.name}</td>
              <td className="border border-gray-300 p-2">{product.description}</td>
              <td className="border border-gray-300 p-2">Rp {product.price.toLocaleString('id-ID')}</td>
              <td className="border border-gray-300 p-2">{product.stock}</td>
              <td className="border border-gray-300 p-2">{product.category}</td>
              <td className="border border-gray-300 p-2">
                <img src={product.imgUrl} alt={product.name} className="w-16 h-16 object-cover" />
              </td>
              <td className="border border-gray-300 p-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product._id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto py-10 md:py-16 px-4 bg-black/10 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom md:slide-in-from-bottom-0">
            <div className="px-6 pt-5 pb-2 border-b relative">
              <h2 className="text-xl font-semibold text-center">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
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
                type="button"
                aria-label="Close"
                className="absolute top-2.5 right-2.5 h-8 w-8 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Product description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (in Rupiah)</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="space-y-2">
                  {imagePreview || formData.imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview || formData.imgUrl}
                      alt={formData.name || 'preview'}
                      className="w-40 h-40 object-cover rounded border"
                    />
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setImageFile(f)
                      if (f) {
                        const reader = new FileReader()
                        reader.onload = () => setImagePreview(reader.result as string)
                        reader.readAsDataURL(f)
                      } else {
                        setImagePreview("")
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">JPG, PNG, or WEBP up to ~5MB</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Plants"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="h-3" />
            </form>
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 sticky bottom-0">
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
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  // submit parent form programmatically
                  (e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement)?.requestSubmit();
                }}
                disabled={uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {uploading ? "Uploading…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}