import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { readdirSync } from "node:fs";

async function main() {
  const name = `juss_migration_test_${randomBytes(8).toString("hex")}`;
  const original = new URL(process.env.DATABASE_URL!);
  const admin = new Client({ connectionString: original.toString() });
  const target = new URL(original);
  target.pathname = `/${name}`;
  await admin.connect();
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    for (let i = 0; i < 2; i++) {
      execFileSync(
        process.execPath,
        ["node_modules/prisma/build/index.js", "migrate", "deploy"],
        {
          env: { ...process.env, DATABASE_URL: target.toString() },
          stdio: "pipe",
        },
      );
    }
    const database = new Client({ connectionString: target.toString() });
    await database.connect();
    try {
      const tables = await database.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
      );
      for (const name of [
        "User",
        "Account",
        "Session",
        "Verification",
        "Organization",
        "OrganizationMember",
        "Brand",
        "ActivityLog",
        "SocialConnection",
        "SocialOAuthAttempt",
      ]) {
        assert.ok(
          tables.rows.some((r) => r.tablename === name),
          `Missing table ${name}`,
        );
      }
      const result = await database.query(
        'SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
      );
      assert.equal(
        result.rows[0].count,
        readdirSync("prisma/migrations", { withFileTypes: true }).filter(
          (entry) => entry.isDirectory(),
        ).length,
      );
      console.log(
        "PASS: migrations apply to an empty PostgreSQL database and are safe to deploy twice.",
      );
    } finally {
      await database.end();
    }
  } finally {
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
