import assert from "node:assert/strict";
import { verifiedOfficialCalendarRows } from "../lib/shared/official-calendar-identity.ts";

const requested = "ipbl-66-m-pro-a";
const item = (tag: unknown, id = 100) => ({
  game: { id, gameStatus: "ResultConfirmed", score1: 75, score2: 70 },
  league: { tag },
  team1: { teamId: 76038, name: "Barnaul" },
  team2: { teamId: 76040, name: "Novosibirsk" },
});
const payload = (items: unknown) => ({ data: { items } });

assert.deepEqual(verifiedOfficialCalendarRows(payload([]), requested), []);
assert.equal(verifiedOfficialCalendarRows(payload([item(requested)]), requested).length, 1);
for (const invalid of [undefined, null, {}, { data: {} }, payload({ items: [] }), payload([null])]) {
  assert.throws(() => verifiedOfficialCalendarRows(invalid, requested), /invalid_calendar_response/);
}
for (const row of [
  { game: { id: 1 } },
  { ...item(requested), league: null },
  item(""),
  item(null),
]) {
  assert.throws(() => verifiedOfficialCalendarRows(payload([row]), requested), /division_identity_unresolved/);
}
assert.throws(
  () => verifiedOfficialCalendarRows(payload([item("ipbl-66-m-pro-x")]), requested),
  /division_mismatch/,
);
assert.throws(
  () => verifiedOfficialCalendarRows(payload([item(requested), item("ipbl-66-m-pro-x", 101)]), requested),
  /division_mismatch/,
  "mixed official response must never silently stamp the requested competition on mismatched records",
);
console.log("Shared official calendar identity contract passed");
