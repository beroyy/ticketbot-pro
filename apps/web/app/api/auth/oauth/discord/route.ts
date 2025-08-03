import { NextRequest, NextResponse } from "next/server";
import { auth } from "@ticketsbot/core/auth";

export async function GET(request: NextRequest) {
  try {
    // Get the session/cookies from the request
    const cookieHeader = request.headers.get("cookie");

    console.log("Proxy OAuth endpoint called");

    // Call Better Auth to generate OAuth URL with proper state
    const authResult = await auth.api.signInSocial({
      body: {
        provider: "discord",
        callbackURL: "/guilds",
      },
      headers: {
        cookie: cookieHeader || "", // Pass cookies to maintain session
      },
    });

    console.log("Better Auth OAuth result:", {
      hasUrl: !!authResult?.url,
      url: authResult?.url,
    });

    if (authResult?.url) {
      const url = new URL(authResult.url);

      // Check if scope needs fixing (has spaces but not encoded)
      const scopeParam = url.searchParams.get("scope");
      if (scopeParam && scopeParam.includes(" ") && !scopeParam.includes("%20")) {
        // Manually reconstruct the URL to avoid double encoding
        const params = new URLSearchParams();

        // Copy all parameters except scope
        for (const [key, value] of url.searchParams.entries()) {
          if (key !== "scope") {
            params.append(key, value);
          }
        }

        // Add properly encoded scope
        params.append("scope", scopeParam.replace(/ /g, "%20"));

        // Reconstruct URL
        const fixedUrl = `${url.origin}${url.pathname}?${params.toString()}`;

        console.log("Fixed OAuth URL:", {
          original: authResult.url,
          fixed: fixedUrl,
        });

        return NextResponse.redirect(fixedUrl);
      }

      // URL is already properly formatted
      return NextResponse.redirect(authResult.url);
    }

    console.error("No OAuth URL in Better Auth response");
    return NextResponse.json({ error: "Failed to generate OAuth URL" }, { status: 500 });
  } catch (error) {
    console.error("Proxy OAuth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
