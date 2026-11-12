"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { socialSession } from "@/lib/social/session.server";
import { disconnectAccount } from "@/lib/social/oauth.server";
import type { FormState } from "./actions";
export async function disconnectSocial(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await socialSession();
  if (!actor) return { error: "Sign in to manage connected accounts." };
  try {
    const { organizationId, connectionId } = z
      .object({
        organizationId: z.string().min(1).max(100),
        connectionId: z.string().min(1).max(100),
      })
      .parse(Object.fromEntries(form));
    const result = await disconnectAccount(actor, organizationId, connectionId);
    revalidatePath("/settings/connections");
    revalidatePath("/", "layout");
    return {
      success: result.manualRevocation
        ? "Disconnected from Juss CMS. Also remove Juss CMS in the platform’s app settings to finish revoking access."
        : "Account disconnected.",
    };
  } catch {
    return {
      error: "Unable to disconnect. You may need an Owner or Admin to help.",
    };
  }
}
