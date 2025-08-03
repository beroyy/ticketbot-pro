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
      // Parse and fix the URL
      const url = new URL(authResult.url);
      const scope = url.searchParams.get("scope");
      
      // Fix unencoded spaces in scope parameter
      if (scope && !scope.includes("%20")) {
        url.searchParams.set("scope", scope.replace(/ /g, "%20"));
        console.log("Fixed OAuth URL scope:", { 
          original: scope, 
          fixed: scope.replace(/ /g, "%20") 
        });
      }

      // Create response with redirect
      // The OAuth state will be managed by Better Auth through its existing cookie mechanism
      return NextResponse.redirect(url.toString());
    }

    console.error("No OAuth URL in Better Auth response");
    return NextResponse.json(
      { error: "Failed to generate OAuth URL" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Proxy OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}