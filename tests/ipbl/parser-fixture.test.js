import fs from 'fs';
import assert from 'assert';
import path from 'path';
import { normalizeCalendarRow, normalizeCalendarPayload } from '../../src/ipbl/parseOfficialApi.js';

const fixtureDir = 'fixtures/ipbl/calendar-row';
const fixtureFile = 'game-1024850-calendar-online-row.json';
const fixturePath = path.join(fixtureDir, fixtureFile);
assert.ok(fs.existsSync(fixturePath), 'calendar-online-row fixture file exists');

const row = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const game = normalizeCalendarRow(row);
assert.strictEqual(game.gameId, 1024850);
assert.strictEqual(game.divisionTag, 'ipbl-66-m-pro-c');
assert.strictEqual(game.score1, 87);
assert.strictEqual(game.score2, 76);
assert.strictEqual(game.score, '87:76');
assert.strictEqual(game.fullScore, null);
assert.strictEqual(game.date, '09.02.2026');
assert.strictEqual(game.team1, 'Voronezh');
assert.strictEqual(game.team2, 'Plavsk');
assert.throws(() => normalizeCalendarRow({ game: { id: 1 } }), /missing required score fields/);

const payload = { data: { items: [row, { game: { showScore: false } }] } };
const normalized = normalizeCalendarPayload(payload);
assert.strictEqual(normalized.length, 1);
assert.deepStrictEqual(normalized[0], game);

console.log(JSON.stringify({ ok: true, normalized: game }, null, 2));
