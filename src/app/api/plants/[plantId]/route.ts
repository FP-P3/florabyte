import { PlantModel } from "@/db/models/plantModel";
import errorHandler from "@/helpers/errorHandler";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ plantId: string }> }
) {
  try {
    const { plantId } = await params;
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw { message: "Please login first", status: 401 };
    }

    if (!plantId) {
      throw { message: "Invalid Plant ID", status: 400 };
    }

    const data = await PlantModel.getPlantById(plantId);
    if (!data) {
      throw { message: "Plant not found", status: 404 };
    }

    if (data.userId !== userId) {
      throw { message: "Unauthorized", status: 403 };
    }

    return Response.json(data);
  } catch (error) {
    errorHandler(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ plantId: string }> }
) {
  try {
    const { plantId } = await params;
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw { message: "Please login first", status: 401 };
    }

    if (!plantId) {
      throw { message: "Invalid Plant ID", status: 400 };
    }

    const data = await PlantModel.getPlantById(plantId);
    if (!data) {
      throw { message: "Plant not found", status: 404 };
    }

    if (data.userId !== userId) {
      throw { message: "Unauthorized", status: 403 };
    }

    await PlantModel.deletePlantById(plantId, userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorHandler(error);
  }
}
