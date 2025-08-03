import { NextRequest, NextResponse } from "next/server";
import { auth } from "@ticketsbot/core/auth";

export async function POST(request: NextRequest) {
  try {
    // Get the callback URL from the request body
    const body = await request.json();
    const callbackURL = body.callbackURL || "/guilds";

    // Call Better Auth's server-side OAuth method
    const result = await auth.api.signInSocial({
      body: {
        provider: "discord",
      },
      headers: request.headers,
    });

    console.log("OAuth result from Better Auth:", {
      hasUrl: !!result?.url,
      url: result?.url,
      fullResult: result,
    });

    if (!result?.url) {
      console.error("No OAuth URL returned from Better Auth");
      return NextResponse.json({ error: "Failed to generate OAuth URL" }, { status: 500 });
    }

    // Return the URL for client-side redirect
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Server-side OAuth error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
