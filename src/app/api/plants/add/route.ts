import { PlantModel } from "@/db/models/plantModel";

export async function POST(req: Request) {
  try {
    const userId: string | null = req.headers.get("x-user-id");
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Please login first!" }),
        { status: 401 }
      );
    }
    const { label, imageUrl, part, plantingPlan, care, schedule, notes } =
      await req.json();
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
