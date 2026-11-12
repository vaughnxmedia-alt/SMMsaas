import { z } from "zod";
export const organizationInput = z.object({
  name: z.string().trim().min(2).max(80),
});
export const brandInput = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  website: z.union([
    z.literal(""),
    z
      .url()
      .max(2048)
      .refine((s) => /^https?:\/\//.test(s), "Use an http or https URL"),
  ]),
  audience: z.string().trim().max(1000),
  tone: z.string().trim().max(1000),
});
export const profileInput = z.object({
  name: z.string().trim().min(2).max(80),
});
export const credentialsInput = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(2).max(80).optional(),
});
export const signUpInput = credentialsInput
  .extend({
    name: z.string().trim().min(2).max(80),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Type the same password in both fields.",
    path: ["confirmPassword"],
  });
export const passwordChangeInput = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Type the same password in both fields.",
    path: ["confirmPassword"],
  });
