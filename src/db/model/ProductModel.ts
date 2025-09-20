import * as z from 'zod'
import { db } from '../config/mongodb'
import { ObjectId } from 'mongodb'
import { ProductType } from '@/types/ProductType'
import { GoogleGenAI } from '@google/genai'

const productSchema = z.object({
  name: z.string({ message: "Name is required" }).trim().min(1, { message: "Name is required" }),
  description: z.string({ message: "Description is required" }).trim().min(1, { message: "Description is required" }),
  price: z.number({ message: "Price is required" }).min(0, { message: "Price must be positive" }),
  stock: z.number({ message: "Stock is required" }).min(0, { message: "Stock must be non-negative" }),
  imgUrl: z.string({ message: "Image URL is required" }).url({ message: "Invalid image URL" }),
  category: z.string({ message: "Category is required" }).trim().min(1, { message: "Category is required" }),
  embedding: z.array(z.number()).optional()
})


const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

class ProductModel {
  static async getProducts(query?: string) {
    let filter = {}
    if (query) {
      filter = {
        $or: [
          { name: { $regex: query, $options: 'i' } },  // Case-insensitive search di name
          { category: { $regex: query, $options: 'i' } }  // Case-insensitive search di category
        ]
      }
    }
    const products = await db.collection("Products").find(filter).toArray()
    return products
  }

  static async getProductById(id: string) {
    const product = await db.collection("Products").findOne({ _id: new ObjectId(id) })
    if (!product) {
      throw { message: "Product not found", status: 404 }
    }
    return product
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_EMBEDDING!}:embedContent?key=${process.env.GOOGLE_API_KEY!}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: { parts: [{ text }] },
        }),
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return data.embedding.values;  // Array number dari API
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw { message: 'Failed to generate embedding', status: 500 };
    }
  }

  static async createProduct(payload: Partial<ProductType>) {
    const parsed = productSchema.parse(payload);
    const now = new Date();
    const textForEmbedding = `${parsed.name} ${parsed.description}`;
    const embedding = await this.generateEmbedding(textForEmbedding);
    const doc: Omit<ProductType, '_id'> = {
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      stock: parsed.stock,
      imgUrl: parsed.imgUrl,
      category: parsed.category,
      embedding,
      createdAt: now,
      updatedAt: now
    };
    const result = await db.collection("Products").insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  static async updateProduct(id: string, payload: Partial<ProductType>) {
    const parsed = productSchema.partial().parse(payload);
    const now = new Date();
    let updateDoc: any = { ...parsed, updatedAt: now };
    if (parsed.name || parsed.description) {
      const product = await this.getProductById(id);
      const textForEmbedding = `${parsed.name || product.name} ${parsed.description || product.description}`;
      updateDoc.embedding = await this.generateEmbedding(textForEmbedding);
    }
    const result = await db.collection("Products").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    if (result.matchedCount === 0) {
      throw { message: "Product not found", status: 404 };
    }
    return { message: "Product updated successfully" };
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