import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { credentialsInput, signUpInput } from "./validation";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { environment } from "./env";
const env = environment();
export const auth = betterAuth({
  appName: "JUSS CMS",
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const result = signUpInput.safeParse(ctx.body);
        if (!result.success)
          throw new APIError("BAD_REQUEST", {
            message: result.error.issues[0].message,
          });
        delete (ctx.body as Record<string, unknown>).confirmPassword;
        return;
      }
      if (ctx.path === "/sign-in/email") {
        const result = credentialsInput.safeParse(ctx.body);
        if (!result.success)
          throw new APIError("BAD_REQUEST", {
            message: result.error.issues[0].message,
          });
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, window: 60, max: 30, storage: "memory" },
  plugins: [
    twoFactor({ issuer: "JUSS CMS" }),
    nextCookies(),
  ],
});
