import { PlantModel } from "@/db/models/plantModel";

export async function POST(req: Request) {
  try {
    const { label, imageUrl, part, plantingPlan, care, schedule, notes } =
      await req.json();
    await PlantModel.AddPlant(
      label,
      imageUrl,
      part,
      plantingPlan,
      care,
      schedule,
      notes
    );

    return Response.json({
      message: `New plant added`,
    });
  } catch (err) {
    console.log(err);
  }
}
