import * as z from "zod";

export default function errorHandler(err: unknown) {
  const error = err as { message: string; status: number };
  if (error instanceof z.ZodError) {
    error.status = 400;
    error.message = error.issues[0].message;
  }
  return Response.json({ message: error.message }, { status: error.status });
}
