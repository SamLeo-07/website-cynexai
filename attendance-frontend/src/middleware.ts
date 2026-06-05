import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
    return new NextResponse(JSON.stringify({}), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
