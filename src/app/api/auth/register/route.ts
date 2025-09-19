import errorHandler from "@/app/helpers/errorHandler";
import UserModel from "@/db/model/UserModel";

export async function POST(req: Request) {
    try {
        const { name, username, password, role = "user" } = await req.json()
        await UserModel.createUser({ name, username, password, role })
        return Response.json({ message: "Your Account has Successfully Registered" })

    } catch (err) {
        console.log(err);
        errorHandler(err)
        // const status = (err as Error).status || 500;
        // const message = (err as Error).message || "Internal Server Error";
        // return Response.json({ message }, { status });

    }
}