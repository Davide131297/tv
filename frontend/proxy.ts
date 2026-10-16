import { NextRequest, NextResponse } from "next/server";

// Environment variables
const CRAWL_API_KEY = process.env.CRAWL_API_KEY;
const POLITICS_API_KEY = process.env.NEXT_PUBLIC_POLITICS_API_KEY;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply middleware to protected API routes
  const isProtectedAPIRoute =
    pathname.startsWith("/api/politics") ||
    pathname.startsWith("/api/database-entries") ||
    pathname.startsWith("/api/party-timeline") ||
    pathname.startsWith("/api/political-areas") ||
    pathname.startsWith("/api/politician-details") ||
    pathname.startsWith("/api/threads-bot") ||
    pathname.startsWith("/api/bluesky-bot") ||
    pathname.startsWith("/api/embed-documents");

  if (!isProtectedAPIRoute) {
    return NextResponse.next();
  }

  return handleAPIProtection(request);
}

function handleAPIProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  try {
    // Handle CORS preflight requests before any method validation
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://polittalk-watcher-mobile.vercel.app",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Method validation - different rules for different APIs
    let allowedMethods: string[];
    if (pathname.startsWith("/api/politics")) {
      allowedMethods = ["GET"]; // Politics API is read-only
    } else {
      allowedMethods = ["GET", "POST"];
    }

    if (!allowedMethods.includes(request.method)) {
      return NextResponse.json(
        { error: `Method ${request.method} not allowed` },
        { status: 405 },
      );
    }

    // Authentication check - different API keys for different routes
    let requireAuth = false;
    let expectedApiKey = "";

    if (
      pathname.startsWith("/api/threads-bot") ||
      pathname.startsWith("/api/bluesky-bot") ||
      pathname.startsWith("/api/embed-documents")
    ) {
      requireAuth = !!(CRAWL_API_KEY && CRAWL_API_KEY !== "default-dev-key");
      expectedApiKey = CRAWL_API_KEY || "";
    } else if (pathname.startsWith("/api/politics")) {
      requireAuth = !!(
        POLITICS_API_KEY && POLITICS_API_KEY !== "default-dev-key"
      );
      expectedApiKey = POLITICS_API_KEY || "";
    }

    if (requireAuth) {
      const authHeader = request.headers.get("authorization");
      const apiKeyFromHeader = authHeader?.replace("Bearer ", "");

      if (!apiKeyFromHeader || apiKeyFromHeader !== expectedApiKey) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid or missing API key" },
          { status: 401 },
        );
      }
    }

    // Continue to the API route
    const response = NextResponse.next();

    // Add performance logging (this will be logged after the request completes)
    response.headers.set("x-middleware-start-time", startTime.toString());

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${new Date().toISOString()}] Middleware Error:`, {
      error: error instanceof Error ? error.message : "Unknown error",
      duration: `${duration}ms`,
      ip,
      pathname,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    "/api/politics",
    "/api/threads-bot/:path*",
    "/api/bluesky-bot/:path*",
    "/api/embed-documents/:path*",
  ],
};

