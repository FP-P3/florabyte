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
    if (!userId) throw { message: "Please login first", status: 401 };

    const { plantId } = await req.json().catch(() => ({ plantId: null }));
    if (!plantId || typeof plantId !== "string") {
      throw { message: "Invalid Plant ID", status: 400 };
    }

    // Ensure plant exists and belongs to user (optional hard check)
    const plant = await PlantModel.getPlantById(plantId);
    if (!plant) throw { message: "Plant not found", status: 404 };
    if (plant.userId !== userId) throw { message: "Unauthorized", status: 403 };

    await PlantModel.deletePlantById(plantId, userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorHandler(error);
  }
}
