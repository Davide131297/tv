import { NextRequest, NextResponse } from "next/server";

// Rate limiting storage (in production use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Environment variables
const CRAWL_API_KEY = process.env.NEXT_PUBLIC_CRAWL_API_KEY;
const POLITICS_API_KEY = process.env.NEXT_PUBLIC_POLITICS_API_KEY;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply middleware to crawl API routes and politics API
  const isProtectedRoute =
    pathname.startsWith("/api/crawl/") || pathname.startsWith("/api/politics");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const startTime = Date.now();
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  try {
    // Method validation - different rules for different APIs
    let allowedMethods: string[];
    if (pathname.startsWith("/api/crawl/")) {
      allowedMethods = ["POST", "DELETE"];
    } else if (pathname.startsWith("/api/politics")) {
      allowedMethods = ["GET"]; // Politics API is read-only
    } else {
      allowedMethods = ["GET", "POST"];
    }

    if (!allowedMethods.includes(request.method)) {
      return NextResponse.json(
        { error: `Method ${request.method} not allowed` },
        { status: 405 }
      );
    }

    // Rate limiting - only for crawl APIs with higher limits
    if (pathname.startsWith("/api/crawl/")) {
      const rateLimitKey = `api:${ip}`;
      const now = Date.now();
      const rateLimitWindowMs = 60 * 1000; // 1 minute

      const maxRequestsPerWindow =
        pathname.includes("maischberger") && request.method === "DELETE"
          ? 10 // Increased from 3 to 10
          : 20; // Increased from 5 to 20

      const rateLimitEntry = rateLimitStore.get(rateLimitKey);

      if (rateLimitEntry) {
        if (now < rateLimitEntry.resetTime) {
          if (rateLimitEntry.count >= maxRequestsPerWindow) {
            return NextResponse.json(
              {
                error: "Rate limit exceeded",
                retryAfter: Math.ceil((rateLimitEntry.resetTime - now) / 1000),
              },
              { status: 429 }
            );
          }
          rateLimitEntry.count++;
        } else {
          // Reset window
          rateLimitEntry.count = 1;
          rateLimitEntry.resetTime = now + rateLimitWindowMs;
        }
      } else {
        rateLimitStore.set(rateLimitKey, {
          count: 1,
          resetTime: now + rateLimitWindowMs,
        });
      }
    }

    // Authentication check - different API keys for different routes
    let requireAuth = false;
    let expectedApiKey = "";

    if (pathname.startsWith("/api/crawl/")) {
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
          { status: 401 }
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
      { status: 500 }
    );
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/crawl/:path*", "/api/politics"],
};

// Cleanup function for rate limit store (should be called periodically)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
