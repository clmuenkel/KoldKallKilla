import { NextResponse, type NextRequest } from "next/server";

const DEBUG_INGEST = "http://127.0.0.1:7242/ingest/73fcbc11-1ac2-44b8-a6d3-3c6d8d6ac42d";

export function middleware(request: NextRequest) {
  // #region agent log
  const path = request.nextUrl.pathname;
  if (path.includes("_next/static/chunks/app") && path.includes("layout")) {
    fetch(DEBUG_INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "middleware.ts:chunk-request",
        message: "Layout chunk requested",
        hypothesisId: "E",
        data: { path, url: request.url, timestamp: Date.now() },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
  // Bypass auth for personal single-user CRM
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
    "/_next/static/chunks/app/layout.js",
  ],
};
