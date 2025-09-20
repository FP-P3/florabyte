import errorHandler from "@/helpers/errorHandler";
import UserModel from "@/db/model/UserModel";

export async function POST(req: Request) {
  try {
    const { name, username, password, role = "user" } = await req.json();
    await UserModel.createUser({ name, username, password, role });
    return Response.json({
      message: "Your account has successfully registered",
    });
  } catch (err) {
    console.log(err);
    return errorHandler(err);
  }
}
