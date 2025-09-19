import { ProductType } from '@/types/ProductType'
import * as z from 'zod'
import { db } from '../config/mongodb'
import { ObjectId } from 'mongodb'

const productSchema = z.object({
  name: z.string({ message: "Name is required" }).trim().min(1, { message: "Name is required" }),
  description: z.string({ message: "Description is required" }).trim().min(1, { message: "Description is required" }),
  price: z.number({ message: "Price is required" }).min(0, { message: "Price must be positive" }),
  stock: z.number({ message: "Stock is required" }).min(0, { message: "Stock must be non-negative" }),
  imgUrl: z.string({ message: "Image URL is required" }).url({ message: "Invalid image URL" }),
  category: z.string({ message: "Category is required" }).trim().min(1, { message: "Category is required" }),
  embedding: z.array(z.number()).optional()
})

class ProductModel {
  static async getProducts() {
    const products = await db.collection("Products").find({}).toArray()
    return products
  }

  static async getProductById(id: string) {
    const product = await db.collection("Products").findOne({ _id: new ObjectId(id) })
    if (!product) {
      throw { message: "Product not found", status: 404 }
    }
    return product
  }

  static async createProduct(payload: Partial<ProductType>) {
    const parsed = productSchema.parse(payload)
    const now = new Date()
    const doc: ProductType = {
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      stock: parsed.stock,
      imgUrl: parsed.imgUrl,
      category: parsed.category,
    //   embedding: parsed.embedding,
      createdAt: now,
      updatedAt: now
    }
    const result = await db.collection("Products").insertOne(doc)
    return { _id: result.insertedId, ...doc }
  }

  static async updateProduct(id: string, payload: Partial<ProductType>) {
    const parsed = productSchema.partial().parse(payload)  // Partial untuk update
    const now = new Date()
    const updateDoc = { ...parsed, updatedAt: now }
    const result = await db.collection("Products").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    )
    if (result.matchedCount === 0) {
      throw { message: "Product not found", status: 404 }
    }
    return { message: "Product updated successfully" }
  }

  static async deleteProduct(id: string) {
    const result = await db.collection("Products").deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
      throw { message: "Product not found", status: 404 }
    }
    return { message: "Product deleted successfully" }
  }
}

export default ProductModel