import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import {
  createOrganization,
  authorize,
  saveBrand,
  deleteBrand,
  setMember,
} from "../src/lib/services";
async function main() {
  const base = process.env.BETTER_AUTH_URL!;
  const suffix = randomBytes(8).toString("hex");
  const password = randomBytes(24).toString("base64url");
  const ids: string[] = [];
  const orgIds: string[] = [];
  async function post(
    path: string,
    body: unknown,
    cookie?: string,
    origin = base,
  ) {
    return fetch(`${base}/api/auth/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }
  async function register(label: string) {
    const email = `juss-test-${label}-${suffix}@example.com`;
    const response = await post("sign-up/email", {
      name: `Test ${label}`,
      email,
      password,
      confirmPassword: password,
    });
    assert.equal(response.status, 200, await response.clone().text());
    const data = await response.json();
    ids.push(data.user.id);
    const cookie = response.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; ");
    assert.ok(cookie.includes("session_token"));
    return { id: data.user.id as string, email, cookie };
  }
  try {
    const anonymous = await fetch(`${base}/dashboard`, { redirect: "manual" });
    assert.equal(anonymous.status, 307);
    assert.match(anonymous.headers.get("location") ?? "", /sign-in/);
    const owner = await register("owner");
    const outsider = await register("outsider");
    const account = await db.account.findFirstOrThrow({
      where: { userId: owner.id, providerId: "credential" },
    });
    assert.ok(
      account.password &&
        account.password !== password &&
        account.password.length > 60,
    );
    const bad = await post("sign-in/email", {
      email: owner.email,
      password: "incorrect-password",
    });
    assert.equal(bad.status, 401);
    const signed = await post("sign-in/email", {
      email: owner.email,
      password,
    });
    assert.equal(signed.status, 200);
    const csrf = await post(
      "sign-out",
      {},
      owner.cookie,
      "https://attacker.invalid",
    );
    assert.equal(csrf.status, 403);
    const org = await createOrganization(owner.id, {
      name: `Test workspace ${suffix}`,
    });
    orgIds.push(org.id);
    const otherOrg = await createOrganization(outsider.id, {
      name: `Other workspace ${suffix}`,
    });
    orgIds.push(otherOrg.id);
    await assert.rejects(() => authorize(outsider.id, org.id, "read"));
    const data = {
      name: "Test Brand",
      description: "Real database profile",
      color: "#3689ff",
      secondaryColor: "#00d4ed",
      website: "https://example.com",
      audience: "Creators",
      tone: "Thoughtful",
    };
    const brand = await saveBrand(owner.id, org.id, undefined, data);
    const hidden = await fetch(`${base}/brands/${brand.id}`, {
      headers: { cookie: outsider.cookie },
    });
    assert.ok([200, 404].includes(hidden.status));
    const hiddenHtml = await hidden.text();
    assert.match(hiddenHtml, /This page isn’t here/);
    assert.ok(!hiddenHtml.includes("Real database profile"));
    const settings = await fetch(`${base}/settings`, {
      headers: { cookie: owner.cookie },
    });
    assert.equal(settings.status, 200);
    const connectionPage = await fetch(`${base}/settings/connections`, {
      headers: { cookie: owner.cookie },
    });
    assert.equal(connectionPage.status, 200);
    const connectionHtml = await connectionPage.text();
    assert.match(connectionHtml, /SIMULATED/);
    assert.match(connectionHtml, /Instagram/);
    assert.match(connectionHtml, /Threads/);
    const wizard = await fetch(
      `${base}/settings/connections/add?returnTo=%2Fpublishing&capability=publish`,
      { headers: { cookie: owner.cookie } },
    );
    assert.equal(wizard.status, 200);
    assert.match(await wizard.text(), /Choose platform/);
    const unconfigured = await fetch(`${base}/api/social/instagram/authorize`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie: owner.cookie, origin: base },
      body: new URLSearchParams({
        organizationId: org.id,
        returnTo: "/publishing",
        capability: "publish",
      }),
    });
    assert.equal(unconfigured.status, 303);
    assert.match(
      unconfigured.headers.get("location") ?? "",
      /notice=unavailable/,
    );
    const socialCsrf = await fetch(`${base}/api/social/instagram/authorize`, {
      method: "POST",
      headers: { cookie: owner.cookie, origin: "https://attacker.invalid" },
      body: new URLSearchParams({ organizationId: org.id }),
    });
    assert.equal(socialCsrf.status, 403);
    const tamperedCallback = await fetch(
      `${base}/api/social/instagram/callback?state=tampered&code=do-not-accept`,
      { redirect: "manual", headers: { cookie: owner.cookie } },
    );
    assert.equal(tamperedCallback.status, 303);
    assert.match(
      tamperedCallback.headers.get("location") ?? "",
      /notice=invalid-state/,
    );
    assert.equal(
      tamperedCallback.headers.get("referrer-policy"),
      "no-referrer",
    );
    for (const route of [
      "content-studio",
      "media-library",
      "content-calendar",
      "publishing",
      "engagement-inbox",
      "audience-intelligence",
      "ai-script-studio",
      "analytics",
    ]) {
      const page = await fetch(`${base}/${route}`, {
        headers: { cookie: owner.cookie },
      });
      assert.equal(page.status, 200);
      assert.match(await page.text(), /COMING IN A FUTURE PHASE/);
    }
    await assert.rejects(() =>
      saveBrand(outsider.id, org.id, brand.id, { ...data, name: "Hacked" }),
    );
    await assert.rejects(() =>
      saveBrand(outsider.id, otherOrg.id, brand.id, {
        ...data,
        name: "Cross-tenant",
      }),
    );
    await assert.rejects(() => deleteBrand(outsider.id, otherOrg.id, brand.id));
    assert.equal(
      (await db.brand.findUniqueOrThrow({ where: { id: brand.id } })).name,
      "Test Brand",
    );
    await setMember(owner.id, org.id, outsider.email, "VIEWER");
    await authorize(outsider.id, org.id, "read");
    await assert.rejects(() => saveBrand(outsider.id, org.id, brand.id, data));
    await assert.rejects(() => deleteBrand(outsider.id, org.id, brand.id));
    await setMember(owner.id, org.id, outsider.email, "EDITOR");
    await saveBrand(outsider.id, org.id, brand.id, {
      ...data,
      name: "Edited Brand",
    });
    await assert.rejects(() =>
      setMember(outsider.id, org.id, owner.email, "VIEWER"),
    );
    await setMember(owner.id, org.id, outsider.email, "ADMIN");
    await assert.rejects(() =>
      setMember(outsider.id, org.id, owner.email, "VIEWER"),
    );
    await assert.rejects(() =>
      authorize(outsider.id, org.id, "workspace:delete"),
    );
    const html = await fetch(`${base}/dashboard`, {
      headers: { cookie: owner.cookie },
    });
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Edited Brand/);
    await db.organizationMember.delete({
      where: {
        organizationId_userId: { organizationId: org.id, userId: outsider.id },
      },
    });
    await assert.rejects(() => authorize(outsider.id, org.id, "read"));
    await deleteBrand(owner.id, org.id, brand.id);
    assert.equal(
      await db.brand.count({ where: { organizationId: org.id } }),
      0,
    );
    assert.ok(
      (await db.activityLog.count({ where: { organizationId: org.id } })) >= 5,
    );
    const logout = await post("sign-out", {}, owner.cookie);
    assert.equal(logout.status, 200);
    const session = await fetch(`${base}/api/auth/get-session`, {
      headers: { cookie: owner.cookie },
    });
    assert.equal(await session.json(), null);
    console.log(
      "PASS: HTTP authentication, password hashing, CSRF, session revocation, role enforcement, tenant isolation, brand CRUD, dashboard, and activity logging.",
    );
  } finally {
    await db.organization.deleteMany({ where: { id: { in: orgIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
