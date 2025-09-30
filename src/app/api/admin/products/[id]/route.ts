import errorHandler from "@/helpers/errorHandler";
import ProductModel from "@/db/model/ProductModel";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";
import cloudinary from "@/db/config/cloudinary";

// Helper untuk cek admin (sama seperti di atas)
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("Authorization")?.value?.replace("Bearer ", "");
  if (!token) throw { message: "Unauthorized", status: 401 };
  interface TokenPayload {
    id: string;
    role?: string;
  }
  const decoded = verify(
    token,
    process.env.JWT_SECRET as string
  ) as TokenPayload;
  if (decoded.role !== "admin") throw { message: "Forbidden", status: 403 };
  return decoded;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAdmin();
    const { id } = await params;
    const product = await ProductModel.getProductById(id);
    return Response.json(product);
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkAdmin();
    const { id } = await params;
    const body = await request.json();
    const result = await ProductModel.updateProduct(id, body);
    return Response.json(result);
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Update tipe params ke Promise
  try {
    await checkAdmin();
    const { id } = await params;

    // Ambil product dulu untuk dapat imgUrl
    const product = await db
      .collection("Products")
      .findOne({ _id: new ObjectId(id) });
    if (!product) throw { message: "Product not found", status: 404 };

    let cloudinaryDeletion: unknown = null;
    if (product.imgUrl && typeof product.imgUrl === "string") {
      try {
        // Ekstrak public_id dari URL Cloudinary
        // Contoh URL: https://res.cloudinary.com/<cloud_name>/image/upload/v1723456789/folder/name_xyz.jpg
        const urlPath = new URL(product.imgUrl).pathname; // /<version>/folder/name_xyz.jpg atau /image/upload/v123/folder/file.jpg
        // Cari segmen setelah '/upload/' (pola umum Cloudinary)
        const uploadIndex = urlPath.indexOf("/upload/");
        let publicIdWithExt = "";
        if (uploadIndex !== -1) {
          publicIdWithExt = urlPath.substring(uploadIndex + 8); // setelah '/upload/'
        } else {
          // fallback: ambil path tanpa leading slash pertama
          publicIdWithExt = urlPath.startsWith("/")
            ? urlPath.slice(1)
            : urlPath;
        }
        // Hilangkan versi v123456 jika ada di depan
        publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, "");
        // Hilangkan ekstensi
        const publicId = publicIdWithExt.replace(/\.[a-zA-Z0-9]{3,4}$/, "");
        if (publicId) {
          cloudinaryDeletion = await cloudinary.uploader
            .destroy(publicId)
            .catch((err) => ({
              error: err?.message || "cloudinary delete failed",
            }));
        }
      } catch (e) {
        console.error("Failed deriving cloudinary public_id for deletion", e);
      }
    }

    const result = await ProductModel.deleteProduct(id);
    return Response.json({ ...result, cloudinary: cloudinaryDeletion });
  } catch (error) {
    return errorHandler(error);
  }
}
