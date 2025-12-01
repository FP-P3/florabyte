import { PlantModel, PlantRequestError } from "@/db/models/plantModel";

export async function POST(req: Request) {
  try {
    const userId: string | null = req.headers.get("x-user-id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "Please login first!" }), {
        status: 401,
      });
    }
    // Accept multipart/form-data with fields image + payload
    const form = await req.formData();
    const { file, payload } = PlantModel.parseAddPlantForm(form);

    const imageUrl = await PlantModel.uploadPlantImage(file);

    const {
      label,
      part,
      plantingPlan,
      care,
      schedule,
      notes,
      recommendedProducts,
    } = payload;

    await PlantModel.AddPlant(
      label,
      imageUrl,
      part,
      plantingPlan,
      care,
      schedule,
      notes,
      recommendedProducts ?? [],
      userId
    );

    return Response.json({
      message: `New plant added`,
    });
  } catch (err) {
    if (err instanceof PlantRequestError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.statusCode,
      });
    }
    console.log(err);
    return new Response(JSON.stringify({ error: "Failed to add plant" }), {
      status: 500,
    });
  }
}
