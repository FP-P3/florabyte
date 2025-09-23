import { PlantModel } from "@/db/models/plantModel";
import cloudinary from "@/db/config/cloudinary";
import { UploadApiResponse } from "cloudinary";
import type { PlantingPlan, Care, EmptyObj, ScheduleItem } from "@/types/types";

type SavePayload = {
  label: Record<string, unknown>;
  part: string;
  plantingPlan: PlantingPlan | EmptyObj;
  care: Care | EmptyObj;
  schedule: ScheduleItem[];
  notes: string[];
};

export async function POST(req: Request) {
  try {
    const userId: string | null = req.headers.get("x-user-id");
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Please login first!" }),
        { status: 401 }
      );
    }
    // Accept multipart/form-data with fields:
    //  - image: File
    //  - payload: JSON string containing { label, part, plantingPlan, care, schedule, notes }
    const form = await req.formData();
    const file = form.get("image") as File | null;
    const payloadStr = form.get("payload") as string | null;

    if (!file || !payloadStr) {
      return new Response(
        JSON.stringify({ error: "Missing image or payload" }),
        { status: 400 }
      );
    }

    let payload: SavePayload;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid payload JSON" }), {
        status: 400,
      });
    }

    const { label, part, plantingPlan, care, schedule, notes } = payload;

    // Upload image to Cloudinary now (on save)
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const cloudinaryResponse = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "plants",
              resource_type: "image",
              transformation: [{ fetch_format: "auto", quality: "auto" }],
            },
            (err, result) =>
              err ? reject(err) : resolve(result as UploadApiResponse)
          )
          .end(buffer);
      }
    );

    const imageUrl = cloudinaryResponse.secure_url as string;

    await PlantModel.AddPlant(
      label,
      imageUrl,
      part,
      plantingPlan,
      care,
      schedule,
      notes,
      userId
    );

    return Response.json({
      message: `New plant added`,
    });
  } catch (err) {
    console.log(err);
  }
}
