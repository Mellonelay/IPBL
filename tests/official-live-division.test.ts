import assert from "node:assert/strict";
import { fetchLiveTag } from "../lib/server/live-feed.ts";

const requested = "ipbl-66-m-pro-a";
const row = (tag: string) => ({
  league: { tag },
  game: {
    id: 2001, gameStatus: "Online", score1: 18, score2: 17,
    localDate: "22.11.2026", localTime: "12:00", period: 1,
  },
  status: { id: "Online", displayName: "Live" },
  team1: { teamId: 76038, name: "Barnaul" },
  team2: { teamId: 76041, name: "Sochi" },
});
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [row("ipbl-66-m-pro-x")] } }), { status: 200 });
  const mismatched = await fetchLiveTag(requested);
  assert.equal(mismatched.games.length, 0);
  assert.match(mismatched.error ?? "", /division_mismatch/, "Live must not promote a Men X row under Men A");

  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [{ ...row(requested), league: undefined }] } }), { status: 200 });
  const unidentified = await fetchLiveTag(requested);
  assert.equal(unidentified.games.length, 0);
  assert.match(unidentified.error ?? "", /division_identity_unresolved/);

  globalThis.fetch = async () => new Response(JSON.stringify({ data: { items: [row(requested)] } }), { status: 200 });
  const valid = await fetchLiveTag(requested);
  assert.equal(valid.error, undefined);
  assert.equal(valid.games.length, 1);
  assert.equal(valid.games[0].tag, requested);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Official Live division identity tests passed");
