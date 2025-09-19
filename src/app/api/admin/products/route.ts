import errorHandler from "@/app/helpers/errorHandler"
import ProductModel from "@/db/model/ProductModel"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

// Helper untuk cek admin
async function checkAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("Authorization")?.value?.replace("Bearer ", "")
  if (!token) throw { message: "Unauthorized", status: 401 }
  const decoded = verify(token, process.env.JWT_SECRET as string) as any
  if (decoded.role !== "admin") throw { message: "Forbidden", status: 403 }
  return decoded
}

export async function GET() {
  try {
    await checkAdmin()
    const products = await ProductModel.getProducts()
    return Response.json(products)
  } catch (error) {
    return errorHandler(error)
  }
}

export async function POST(request: Request) {
  try {
    await checkAdmin()
    const body = await request.json()
    const product = await ProductModel.createProduct(body)
    return Response.json(product, { status: 201 })
  } catch (error) {
    return errorHandler(error)
  }
}