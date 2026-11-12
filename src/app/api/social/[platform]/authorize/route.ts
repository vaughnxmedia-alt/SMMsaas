import { NextRequest, NextResponse } from "next/server";
import { isPlatform, safeReturnTo } from "@/lib/social/catalog";
import { socialSession } from "@/lib/social/session.server";
import { beginAuthorization, ConnectionError } from "@/lib/social/oauth.server";
import { AccessError } from "@/lib/services";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const platform = (await params).platform.toUpperCase();
  if (!isPlatform(platform))
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  const actor = await socialSession();
  if (!actor)
    return NextResponse.json(
      { error: "Sign in before adding an account." },
      { status: 401 },
    );
  if (
    request.headers.get("origin") !==
    new URL(process.env.BETTER_AUTH_URL!).origin
  )
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  let returnTo = "/settings/connections";
  try {
    const form = await request.formData();
    returnTo = safeReturnTo(form.get("returnTo"));
    const url = await beginAuthorization(actor, platform, {
      organizationId: form.get("organizationId"),
      returnTo,
      capabilities: form.getAll("capability"),
      connectionId: form.get("connectionId") || undefined,
    });
    return NextResponse.redirect(url, 303);
  } catch (error) {
    if (error instanceof AccessError)
      return NextResponse.json({ error: error.message }, { status: 403 });
    const recovery = new URL(
      "/settings/connections/add",
      process.env.BETTER_AUTH_URL,
    );
    recovery.searchParams.set("platform", platform);
    recovery.searchParams.set("returnTo", returnTo);
    recovery.searchParams.set(
      "notice",
      error instanceof ConnectionError ? error.code : "failed",
    );
    return NextResponse.redirect(recovery, 303);
  }
}
