import ProductModel from "@/db/model/ProductModel";
import errorHandler from "@/helpers/errorHandler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "12");

    const data = await ProductModel.getProductsPaged({
      query: q,
      category,
      page,
      pageSize,
    });

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return errorHandler(err);
  }
}
