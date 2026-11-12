import { db } from "./db";
import { can, type Permission } from "./permissions";
import { brandInput, organizationInput } from "./validation";
import { Prisma, Role } from "@prisma/client";
export class InputError extends Error {}
export class AccessError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
  }
}
export async function authorize(
  userId: string,
  organizationId: string,
  permission: Permission,
  client: Prisma.TransactionClient = db,
) {
  const member = await client.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!member || !can(member.role, permission)) throw new AccessError();
  return member;
}
export async function createOrganization(userId: string, input: unknown) {
  const { name } = organizationInput.parse(input);
  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name, members: { create: { userId, role: "OWNER" } } },
    });
    await tx.activityLog.create({
      data: { organizationId: org.id, userId, action: "Created the workspace" },
    });
    return org;
  });
}
export async function saveBrand(
  userId: string,
  organizationId: string,
  id: string | undefined,
  input: unknown,
) {
  const data = brandInput.parse(input);
  return db.$transaction(async (tx) => {
    await authorize(userId, organizationId, "brand:write", tx);
    const brand = id
      ? await tx.brand.update({ where: { id, organizationId }, data })
      : await tx.brand.create({ data: { ...data, organizationId } });
    await tx.activityLog.create({
      data: {
        organizationId,
        userId,
        action: `${id ? "Updated" : "Created"} brand “${brand.name}”`,
      },
    });
    return brand;
  });
}
export async function deleteBrand(
  userId: string,
  organizationId: string,
  id: string,
) {
  return db.$transaction(async (tx) => {
    await authorize(userId, organizationId, "brand:write", tx);
    const brand = await tx.brand.delete({ where: { id, organizationId } });
    await tx.activityLog.create({
      data: { organizationId, userId, action: `Deleted brand “${brand.name}”` },
    });
  });
}
export async function setMember(
  userId: string,
  organizationId: string,
  email: string,
  role: Role,
) {
  if (!["ADMIN", "EDITOR", "VIEWER"].includes(role)) throw new AccessError();
  return db.$transaction(async (tx) => {
    const actor = await authorize(
      userId,
      organizationId,
      "workspace:manage",
      tx,
    );
    const target = await tx.user.findUnique({ where: { email } });
    if (!target)
      throw new InputError("Ask this person to register an account first.");
    const previous = await tx.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: target.id } },
    });
    if (
      target.id === userId ||
      previous?.role === "OWNER" ||
      (actor.role !== "OWNER" &&
        (role === "ADMIN" || previous?.role === "ADMIN"))
    )
      throw new AccessError();
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId: target.id } },
      create: { organizationId, userId: target.id, role },
      update: { role },
    });
    await tx.activityLog.create({
      data: {
        organizationId,
        userId,
        action: `Updated membership for ${target.name}`,
      },
    });
  });
}
