"use server";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  authorize,
  createOrganization,
  saveBrand,
  deleteBrand,
  setMember,
  AccessError,
  InputError,
} from "@/lib/services";
import {
  organizationInput,
  passwordChangeInput,
  profileInput,
} from "@/lib/validation";
export type FormState = { error?: string; success?: string };
function errorMessage(e: unknown) {
  if (e instanceof z.ZodError)
    return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  if (e instanceof AccessError || e instanceof InputError) return e.message;
  return "Unable to save. Check your input and try again.";
}
export async function mutate(
  kind: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const org = String(form.get("organizationId") ?? "");
  try {
    if (kind === "organization:create") {
      const created = await createOrganization(
        user.id,
        Object.fromEntries(form),
      );
      (await cookies()).set("workspace", created.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    } else if (kind === "organization:update") {
      const data = organizationInput.parse(Object.fromEntries(form));
      await db.$transaction(async (tx) => {
        await authorize(user.id, org, "workspace:manage", tx);
        await tx.organization.update({ where: { id: org }, data });
        await tx.activityLog.create({
          data: {
            organizationId: org,
            userId: user.id,
            action: "Renamed the workspace",
          },
        });
      });
    } else if (kind === "organization:delete") {
      await db.$transaction(async (tx) => {
        await authorize(user.id, org, "workspace:delete", tx);
        const existing = await tx.organization.findUniqueOrThrow({
          where: { id: org },
        });
        if (form.get("confirmation") !== existing.name) throw new AccessError();
        await tx.organization.delete({ where: { id: org } });
      });
    } else if (kind === "brand:save") {
      await saveBrand(
        user.id,
        org,
        String(form.get("id") ?? "") || undefined,
        Object.fromEntries(form),
      );
    } else if (kind === "brand:delete") {
      await deleteBrand(user.id, org, String(form.get("id")));
    } else if (kind === "profile") {
      await db.user.update({
        where: { id: user.id },
        data: profileInput.parse(Object.fromEntries(form)),
      });
    } else if (kind === "member:save") {
      const { email, role } = z
        .object({
          email: z.email().transform((s) => s.toLowerCase()),
          role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
        })
        .parse(Object.fromEntries(form));
      await setMember(user.id, org, email, role);
    } else if (kind === "member:remove") {
      const targetId = String(form.get("userId"));
      await db.$transaction(async (tx) => {
        const actor = await authorize(user.id, org, "workspace:manage", tx);
        const target = await tx.organizationMember.findUniqueOrThrow({
          where: {
            organizationId_userId: { organizationId: org, userId: targetId },
          },
        });
        if (
          target.role === "OWNER" ||
          targetId === user.id ||
          (target.role === "ADMIN" && actor.role !== "OWNER")
        )
          throw new AccessError();
        await tx.organizationMember.delete({ where: { id: target.id } });
        await tx.activityLog.create({
          data: {
            organizationId: org,
            userId: user.id,
            action: "Removed a workspace member",
          },
        });
      });
    } else {
      throw new AccessError();
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/", "layout");
  if (kind === "organization:create")
    redirect(form.get("returnTo") === "/" ? "/" : "/dashboard");
  if (kind === "member:save" && form.get("returnTo") === "/") redirect("/");
  if (kind === "organization:delete") redirect("/dashboard");
  if (kind === "brand:save" || kind === "brand:delete") redirect("/brands");
  return { success: "Changes saved." };
}
export async function changePassword(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = passwordChangeInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Unable to change your password. Please retry.",
    };
  }
  return {
    success: "Password changed. Other sessions have been revoked.",
  };
}
export async function switchWorkspace(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("workspace"));
  await authorize(user.id, id, "read");
  const jar = await cookies();
  jar.set("workspace", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  jar.delete("brand");
  revalidatePath("/", "layout");
  redirect(destination(form.get("next")));
}
function destination(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  if (
    raw === "/" ||
    raw === "/dashboard" ||
    raw === "/organizations" ||
    raw === "/settings/connections"
  )
    return raw;
  if (raw.startsWith("/settings/connections/add?")) {
    const url = new URL(raw, "http://juss.local");
    if (
      url.origin === "http://juss.local" &&
      url.pathname === "/settings/connections/add"
    )
      return `${url.pathname}${url.search}`;
  }
  return "/dashboard";
}
export async function switchBrand(form: FormData) {
  const user = await requireUser();
  const org = String(form.get("organizationId"));
  await authorize(user.id, org, "read");
  const id = String(form.get("brand"));
  if (id)
    await db.brand.findUniqueOrThrow({ where: { id, organizationId: org } });
  (await cookies()).set("brand", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/dashboard");
}
