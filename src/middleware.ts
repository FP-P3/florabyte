import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./db/helpers/jwt";
import errorHandler from "./helpers/errorHandler";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/payment/notification") {
    return NextResponse.next(); // bebas auth
  }

  const cookieStore = await cookies();
  const auth = cookieStore.get("Authorization")?.value;

  if (request.nextUrl.pathname === "/login") {
    if (auth) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/profile") {
    if (!auth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/plants")) {
    if (!auth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/cms")) {
    if (!auth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const [type, token] = auth?.split(" ");
    if (type !== "Bearer" || !token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const decodedToken = verifyToken(token) as { id: string; role: string };

    if (decodedToken.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/cms")) {
    try {
      if (!auth) throw { message: "Please login first", status: 401 };
      const [type, token] = auth?.split(" ");

      if (type !== "Bearer" || !token)
        throw { message: "Invalid token", status: 401 };
      const decodedToken = verifyToken(token) as { id: string; role: string };

      if (decodedToken.role !== "admin")
        throw { message: "Forbidden Access", status: 403 };

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decodedToken.id as string);
      requestHeaders.set("x-user-role", decodedToken.role as string);
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      return response;
    } catch (err) {
      return errorHandler(err);
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/plants")) {
    try {
      if (!auth) throw { message: "Please login first", status: 401 };

      const [type, token] = auth?.split(" ");

      if (type !== "Bearer" || !token)
        throw { message: "Invalid token", status: 401 };

      const decodedToken = verifyToken(token) as { id: string; role: string };

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decodedToken.id as string);
      requestHeaders.set("x-user-role", decodedToken.role as string);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      return response;
    } catch (err) {
      return errorHandler(err);
    }
  }

  if (request.nextUrl.pathname === "/api/cart") {
    try {
      if (!auth) throw { message: "Please login first", status: 401 };

      const [type, token] = auth?.split(" ");

      if (type !== "Bearer" || !token)
        throw { message: "Invalid token", status: 401 };

      const decodedToken = verifyToken(token) as { id: string; role: string };

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decodedToken.id as string);
      requestHeaders.set("x-user-role", decodedToken.role as string);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      return response;
    } catch (err) {
      return errorHandler(err);
    }
  }

  // Protect create payment -> inject x-user-id
  if (request.nextUrl.pathname === "/api/payment/create") {
    try {
      if (!auth) throw { message: "Please login first", status: 401 };
      const [type, token] = auth.split(" ");
      if (type !== "Bearer" || !token)
        throw { message: "Invalid token", status: 401 };

      const decodedToken = verifyToken(token) as { id: string; role: string };
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decodedToken.id);
      requestHeaders.set("x-user-role", decodedToken.role);
      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }
}

export const config = {
  matcher: [
    "/api/plants/:path*",
    "/plants/:path*",
    "/login",
    "/api/cart",
    "/profile",
    "/api/payment/:path*",
    "/api/cms/:path*",
    "/cms/:path*",
  ],
  runtime: "nodejs",
};
