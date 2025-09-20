"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const handleLogout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("Authorization");
  redirect("/login");
};
