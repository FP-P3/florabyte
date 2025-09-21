import errorHandler from "@/helpers/errorHandler"
import ProductModel from "@/db/model/ProductModel"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

// Helper untuk cek admin (sama seperti di atas)
async function checkAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("Authorization")?.value?.replace("Bearer ", "")
  if (!token) throw { message: "Unauthorized", status: 401 }
  const decoded = verify(token, process.env.JWT_SECRET as string) as any
  if (decoded.role !== "admin") throw { message: "Forbidden", status: 403 }
  return decoded
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await checkAdmin()
    const { id } = await params
    const product = await ProductModel.getProductById(id)
    return Response.json(product)
  } catch (error) {
    return errorHandler(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await checkAdmin()
    const { id } = await params
    const body = await request.json()
    const result = await ProductModel.updateProduct(id, body)
    return Response.json(result)
  } catch (error) {
    return errorHandler(error)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {  // Update tipe params ke Promise
  try {
    await checkAdmin()
    const { id } = await params  // Await params sebelum pakai
    const result = await ProductModel.deleteProduct(id)  // Pakai id yang sudah awaited
    return Response.json(result)
  } catch (error) {
    return errorHandler(error)
  }
}