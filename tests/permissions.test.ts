import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { can } from "../src/lib/permissions";
import {
  brandInput,
  organizationInput,
  credentialsInput,
  signUpInput,
  passwordChangeInput,
} from "../src/lib/validation";
describe("workspace role policy", () => {
  it("allows read access to members", () => {
    for (const role of ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const)
      assert.equal(can(role, "read"), true);
  });
  it("restricts deletion to owners", () => {
    assert.equal(can("OWNER", "workspace:delete"), true);
    for (const role of ["ADMIN", "EDITOR", "VIEWER"] as const)
      assert.equal(can(role, "workspace:delete"), false);
  });
  it("permits editor brand operations but not membership management", () => {
    assert.equal(can("EDITOR", "brand:write"), true);
    assert.equal(can("EDITOR", "workspace:manage"), false);
  });
  it("denies viewer mutations", () => {
    assert.equal(can("VIEWER", "brand:write"), false);
    assert.equal(can("VIEWER", "workspace:manage"), false);
  });
  it("permits admin management", () =>
    assert.equal(can("ADMIN", "workspace:manage"), true));
});
describe("server input schemas", () => {
  const brand = {
    name: "Studio",
    description: "",
    color: "#3689ff",
    secondaryColor: "#00d4ed",
    website: "",
    audience: "",
    tone: "",
  };
  it("rejects unsafe URLs and malformed colors", () => {
    assert.equal(
      brandInput.safeParse({ ...brand, website: "javascript:alert(1)" })
        .success,
      false,
    );
    assert.equal(
      brandInput.safeParse({ ...brand, color: "red" }).success,
      false,
    );
  });
  it("accepts valid brand profiles", () =>
    assert.equal(
      brandInput.safeParse({ ...brand, website: "https://example.com" })
        .success,
      true,
    ));
  it("rejects empty workspaces", () =>
    assert.equal(organizationInput.safeParse({ name: "  " }).success, false));
  it("rejects weak credentials", () => {
    assert.equal(
      credentialsInput.safeParse({ email: "bad", password: "short" }).success,
      false,
    );
    assert.equal(
      credentialsInput.safeParse({
        email: "person@example.com",
        password: "short",
      }).success,
      false,
    );
  });
  it("requires the password to be typed twice", () => {
    const signup = {
      name: "Ada",
      email: "person@example.com",
      password: "correct-horse-battery",
    };
    assert.equal(
      signUpInput.safeParse({ ...signup, confirmPassword: "different-horse" })
        .success,
      false,
    );
    assert.equal(
      signUpInput.safeParse({
        ...signup,
        confirmPassword: "correct-horse-battery",
      }).success,
      true,
    );
    assert.equal(
      passwordChangeInput.safeParse({
        currentPassword: "correct-horse-battery",
        newPassword: "correct-horse-battery",
        confirmPassword: "different-horse",
      }).success,
      false,
    );
  });
});
