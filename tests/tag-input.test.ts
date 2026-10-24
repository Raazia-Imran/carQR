import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { normalizeTagInput } from "../packages/shared/tag-input";
const token = randomBytes(32).toString("base64url");
const origin = "http://localhost:3000";
test("claim input accepts raw codes and same-origin URLs with whitespace, query and fragment", () => {
  for (const input of [
    token,
    `  ${token}\n`,
    `${origin}/q/${token}`,
    ` ${origin}/q/${token}/?print=1#qr `,
  ])
    assert.equal(normalizeTagInput(input, origin), token);
});
test("claim input rejects foreign, credentialed and malformed URLs without echoing them", () => {
  for (const input of [
    "",
    "short",
    `/q/${token}`,
    `${origin}/q/${token}/extra`,
    `https://foreign.example/q/${token}`,
    `http://localhost:3001/q/${token}`,
    `http://secret@localhost:3000/q/${token}`,
    `javascript:alert('${token}')`,
    `${origin}/other/${token}`,
    `${origin}/q/${token}%20`,
  ])
    assert.throws(
      () => normalizeTagInput(input, origin),
      (e) =>
        e instanceof Error &&
        e.message.includes("from this website") &&
        !e.message.includes(token) &&
        !e.message.includes("secret@"),
    );
});
