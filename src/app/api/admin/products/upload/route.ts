import errorHandler from "@/helpers/errorHandler";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import cloudinary from "@/db/config/cloudinary";

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore
    .get("Authorization")?.value?.replace("Bearer ", "");
  if (!token) throw { message: "Unauthorized", status: 401 };
  const decoded = verify(token, process.env.JWT_SECRET as string) as any;
  if (decoded.role !== "admin") throw { message: "Forbidden", status: 403 };
  return decoded;
}

export async function POST(request: Request) {
  try {
    await checkAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      throw { message: "No file uploaded", status: 400 };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: { secure_url: string; public_id: string } = await new Promise(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error || !result) return reject(error || new Error("Upload failed"));
            resolve({ secure_url: (result as any).secure_url, public_id: result.public_id });
          }
        );
        stream.end(buffer);
      }
    );

    return Response.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id });
  } catch (error) {
    return errorHandler(error);
  }
}
