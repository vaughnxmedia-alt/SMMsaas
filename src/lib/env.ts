import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (s) => /^postgres(ql)?:\/\//.test(s),
      "Use a PostgreSQL connection URL",
    ),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine(
      (s) => !s.startsWith("REPLACE_"),
      "Generate a random authentication secret",
    ),
  BETTER_AUTH_URL: z.url(),
});
export function environment() {
  return schema.parse(process.env);
}
