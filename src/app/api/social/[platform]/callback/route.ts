import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isPlatform } from "@/lib/social/catalog";
import { socialSession } from "@/lib/social/session.server";
import {
  completeAuthorization,
  ConnectionError,
} from "@/lib/social/oauth.server";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const platform = (await params).platform.toUpperCase();
  const recovery = new URL(
    "/settings/connections",
    process.env.BETTER_AUTH_URL,
  );
  const actor = await socialSession();
  if (!actor) {
    const response = NextResponse.redirect(
      new URL("/sign-in", process.env.BETTER_AUTH_URL),
      303,
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  try {
    if (!isPlatform(platform)) throw new ConnectionError("invalid-state");
    const result = await completeAuthorization(
      actor,
      platform,
      request.nextUrl.searchParams,
    );
    (await cookies()).set("workspace", result.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    const response = NextResponse.redirect(
      new URL(result.returnTo, process.env.BETTER_AUTH_URL),
      303,
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (
      error instanceof ConnectionError &&
      error.returnTo &&
      isPlatform(platform)
    ) {
      recovery.pathname = "/settings/connections/add";
      recovery.searchParams.set("platform", platform);
      recovery.searchParams.set("returnTo", error.returnTo);
    }
    recovery.searchParams.set(
      "notice",
      error instanceof ConnectionError ? error.code : "failed",
    );
    const response = NextResponse.redirect(recovery, 303);
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
