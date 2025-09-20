import ProductModel from "@/db/model/ProductModel";
import errorHandler from "@/helpers/errorHandler";

export async function GET() {
  try {
    const products = await ProductModel.getAll();
    return new Response(JSON.stringify(products), { status: 200 });
  } catch (err) {
    return errorHandler(err);
  }
}
