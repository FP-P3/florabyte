import CartModel from "@/db/model/CartModel";
import errorHandler from "@/helpers/errorHandler";

export async function POST(request: Request) {
  try {
    const { productId } = await request.json();
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      throw { message: "Unauthorized", status: 401 };
    }
    await CartModel.create(userId, productId);
    return Response.json({ message: "Product added to cart" });
  } catch (err) {
    return errorHandler(err);
  }
}

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      throw { message: "Unauthorized", status: 401 };
    }
    const wishlists = await CartModel.getByUserIdWithProducts(userId);
    return Response.json(wishlists);
  } catch (err) {
    return errorHandler(err);
  }
}
