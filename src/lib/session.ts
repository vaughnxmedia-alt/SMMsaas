import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user;
}
export async function workspaceContext() {
  const user = await requireUser();
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  const selected = (await cookies()).get("workspace")?.value;
  const membership =
    memberships.find((m) => m.organizationId === selected) ?? memberships[0];
  return {
    user,
    memberships,
    membership,
    organization: membership?.organization,
  };
}
