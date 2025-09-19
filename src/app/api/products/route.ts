import ProductModel from "@/db/model/ProductModel";

export async function GET() {
  try {
    const products = await ProductModel.getAll();
    console.log("Fetched products:", products); // Tambahkan ini untuk debug
    return new Response(JSON.stringify(products), { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
}
