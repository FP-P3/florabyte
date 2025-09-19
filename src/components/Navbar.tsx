import { cookies } from "next/headers";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("Authorization");
  const isSignedIn = Boolean(auth?.value);
  // const isSignedIn = true; // contoh

  return <NavbarClient isSignedIn={isSignedIn} />;
}
