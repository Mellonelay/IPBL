import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync(new URL('../../api/results/live.ts', import.meta.url), 'utf8');
assert.match(routeSource, /function pickScore/, 'API live route must include nested score extraction helper');
assert.match(routeSource, /SC\?\.FS/, 'API live route must read nested SC.FS score fields');
assert.match(routeSource, /errorCode: 'EMPTY'/, 'API live route must return explicit EMPTY instead of silent empty games');
assert.match(routeSource, /errorCode: 'SOURCE_UNAVAILABLE'/, 'API live route must return explicit SOURCE_UNAVAILABLE');
assert.match(routeSource, /errorCode: 'PARSER_ERROR'/, 'API live route must return explicit PARSER_ERROR');
