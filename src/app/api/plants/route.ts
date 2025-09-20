import { PlantModel } from "@/db/models/plantModel";
import errorHandler from "@/helpers/errorHandler";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  try {
    const userId: string | null = req.headers.get("x-user-id");
    if (!userId) throw { message: "Please login first", status: 401 };
    const data = await PlantModel.getPlantsByUserId(userId);
    return Response.json(data);
  } catch (err) {
    errorHandler(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { plantId }: { plantId: string } = await req.json();
    if (!plantId) {
      return new Response(JSON.stringify({ error: "Invalid Plant ID" }), {
        status: 400,
      });
    }

    await PlantModel.deletePlantById(plantId, userId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
