import { NextRequest, NextResponse } from "next/server";

// Rate limiting storage (in production use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Environment variables
const CRAWL_API_KEY = process.env.NEXT_PUBLIC_CRAWL_API_KEY;
const POLITICS_API_KEY = process.env.NEXT_PUBLIC_POLITICS_API_KEY;

// Protected routes that require authentication
const protectedRoutes: string[] = [
  // Currently no server-side protected routes - using client-side protection instead
];

// Auth routes that should redirect authenticated users
const authRoutes = ["/auth/login", "/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle authentication for protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    return await handleAuthProtection(request);
  }

  // Handle auth routes (redirect logged in users)
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    return await handleAuthRedirection(request);
  }

  // Apply middleware to crawl API routes and politics API
  const isProtectedAPIRoute =
    pathname.startsWith("/api/crawl/") || pathname.startsWith("/api/politics");

  if (!isProtectedAPIRoute) {
    return NextResponse.next();
  }

  return handleAPIProtection(request);
}

async function handleAuthProtection(request: NextRequest) {
  try {
    // Debug: Log all cookies
    const cookies = request.cookies;
    const allCookies = cookies.getAll();

    console.log(
      "🔍 Debug - All cookies:",
      allCookies.map((c) => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
      }))
    );

    // Check for any Supabase auth cookies
    let hasValidAuth = false;
    let foundAuthCookie = false;

    for (const cookie of allCookies) {
      // Look for any cookie that might be a Supabase auth token
      if (
        cookie.name.includes("sb-") ||
        cookie.name.includes("supabase") ||
        cookie.name.includes("auth")
      ) {
        foundAuthCookie = true;
        console.log(
          "🔍 Found potential auth cookie:",
          cookie.name,
          "Length:",
          cookie.value?.length
        );

        if (cookie.value && cookie.value.length > 20) {
          try {
            const tokenData = JSON.parse(cookie.value);
            console.log("🔍 Token data keys:", Object.keys(tokenData));

            if (tokenData.access_token && tokenData.expires_at) {
              const expiresAt = tokenData.expires_at * 1000; // Convert to milliseconds
              const now = Date.now();
              console.log(
                "🔍 Token expires at:",
                new Date(expiresAt),
                "Now:",
                new Date(now),
                "Valid:",
                expiresAt > now
              );

              if (expiresAt > now) {
                hasValidAuth = true;
                console.log("✅ Valid auth found!");
                break;
              }
            }
          } catch (parseError) {
            console.log("❌ Failed to parse cookie:", cookie.name, parseError);
            // Continue checking other cookies
            continue;
          }
        }
      }
    }

    console.log("🔍 Auth check result:", {
      foundAuthCookie,
      hasValidAuth,
      totalCookies: allCookies.length,
    });

    if (!hasValidAuth) {
      console.log("❌ No valid auth, redirecting to login");
      // No valid session, redirect to login
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log("✅ Auth valid, allowing access");
    // User is authenticated, continue
    return NextResponse.next();
  } catch (error) {
    console.error("❌ Error in auth protection middleware:", error);
    // On error, redirect to login
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

async function handleAuthRedirection(request: NextRequest) {
  try {
    // Check for any Supabase auth cookies
    const cookies = request.cookies;
    const allCookies = cookies.getAll();

    for (const cookie of allCookies) {
      if (
        cookie.name.includes("sb-") &&
        cookie.name.includes("auth-token") &&
        cookie.value &&
        cookie.value.length > 50
      ) {
        try {
          const tokenData = JSON.parse(cookie.value);
          if (tokenData.access_token && tokenData.expires_at) {
            const expiresAt = tokenData.expires_at * 1000; // Convert to milliseconds
            if (expiresAt > Date.now()) {
              return NextResponse.redirect(new URL("/", request.url));
            }
          }
        } catch {
          // Continue checking other cookies
          continue;
        }
      }
    }

    // User is not logged in, continue to auth page
    return NextResponse.next();
  } catch (error) {
    console.error("Error in auth redirection middleware:", error);
    return NextResponse.next();
  }
}

function handleAPIProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: [
    "/api/crawl/:path*",
    "/api/politics",
    "/auth/login",
    "/auth/register",
  ],
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
