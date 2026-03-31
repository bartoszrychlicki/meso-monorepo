import { NextRequest, NextResponse } from "next/server";

const AUTH_USER = process.env.BASIC_AUTH_USER || "meso";
const AUTH_PASS = process.env.BASIC_AUTH_PASS || "likwidacja2026";

export function middleware(request: NextRequest) {
  const auth = request.headers.get("authorization");

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (user === AUTH_USER && pass === AUTH_PASS) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Dostęp ograniczony", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MESO Food"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|monitoring).*)"],
};
