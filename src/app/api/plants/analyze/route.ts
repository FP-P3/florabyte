import { PlantModel, GeminiParsingError } from "@/db/models/plantModel";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
      });
    }

    const analysis = await PlantModel.analyzePlantImage(file);
    console.log(analysis.aiJson, "<- aiJson");

    if (!analysis.accepted) {
      return new Response(
        JSON.stringify({
          accepted: false,
          reason: analysis.reason || "Unidentified",
          ai: analysis.aiJson,
        }),
        { status: 400 }
      );
    }

    const { productRecommendations, terms, diagnostics } =
      await PlantModel.fetchRecommendedProducts({
        aiJson: analysis.aiJson,
        supplies: analysis.supplies,
        species: analysis.species,
      });
    console.log("vector terms:", terms);

    const imageUrl = "";

    return new Response(
      JSON.stringify({
        accepted: true,
        imageUrl,
        ai: analysis.aiJson,
        productRecommendations,
        terms,
        diagnostics,
      }),
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof GeminiParsingError) {
      return new Response(
        JSON.stringify({
          error: "AI returned non-JSON",
          raw: err.raw,
          cleaned: err.cleaned,
        }),
        { status: 502 }
      );
    }
    console.log(err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ err: "Internal server error", detail: message }),
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { url } = (await req.json()) as { url: string };
  if (!url) {
    return new Response(JSON.stringify({ error: "No URL provided" }), {
      status: 400,
    });
  }

  try {
    const res = await PlantModel.deleteImageByUrl(url);
    console.log("Deleted:", res);
    return res;
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    throw err;
  }
}
