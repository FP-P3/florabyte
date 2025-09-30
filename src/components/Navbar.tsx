import { cookies } from "next/headers";
import NavbarClient from "./NavbarClient";
import { unstable_noStore as noStore } from "next/cache";

export default async function Navbar() {
  noStore(); // pastikan tidak dicache: baca cookie tiap request
  const cookieStore = await cookies();
  const auth = cookieStore.get("Authorization");
  const isSignedIn = Boolean(auth?.value);

  return <NavbarClient isSignedIn={isSignedIn} />;
}
