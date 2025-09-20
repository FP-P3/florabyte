import ProductModel from "@/db/model/ProductModel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  if (!category) {
    const products = await ProductModel.getAll();
    return new Response(JSON.stringify(products), { status: 200 });
  }

  const products = await ProductModel.getByCategory(category);
  return new Response(JSON.stringify(products), { status: 200 });
}
