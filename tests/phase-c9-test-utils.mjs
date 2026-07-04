import { readFile } from 'node:fs/promises';

function jsonResponse(body, { status = 200, contentType = 'application/json; charset=utf-8' } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? contentType : null;
      },
    },
    async text() {
      return text;
    },
  };
}

export async function createPhaseC9MockFetch() {
  const eventsstatFixture = JSON.parse(
    await readFile(new URL('./fixtures/phase-c9/eventsstat-history-graph-ext.json', import.meta.url), 'utf8'),
  );

  const productionRow = {
    gameId: '123',
    divisionTag: 'ipbl-66-m-pro-a',
    homeName: 'Lions',
    awayName: 'Tigers',
    homeScore: 24,
    awayScore: 21,
    period: 2,
    clock: '07:34',
    status: 'live',
  };

  const melbetEvent = {
    I: 123,
    LI: 2496666,
    O1: 'Lions',
    O2: 'Tigers',
    SC: {
      FS: { S1: 24, S2: 21 },
      CP: 2,
      CPS: 'live',
    },
  };

  return async function mockFetch(url) {
    const href = String(url);
    const parsed = new URL(href);

    if (parsed.hostname === 'ipbl.pro' && parsed.pathname === '/live') {
      return jsonResponse('<html><body>IPBL live landing</body></html>', { contentType: 'text/html; charset=utf-8' });
    }

    if (parsed.hostname === 'worker.mloneslot99.com' && parsed.pathname === '/ipbl-proxy/calendar/online') {
      return jsonResponse({
        games: [
          {
            gameId: productionRow.gameId,
            divisionTag: productionRow.divisionTag,
            homeName: productionRow.homeName,
            awayName: productionRow.awayName,
            homeScore: productionRow.homeScore,
            awayScore: productionRow.awayScore,
          },
        ],
      });
    }

    if (parsed.hostname === 'ipbl-minimal-viewer.vercel.app' && parsed.pathname === '/api/results/live') {
      return jsonResponse({
        games: [productionRow],
        status: {
          status: 'OK',
          source: 'official',
          requestedDivisions: 1,
          successfulDivisions: 1,
          matchedBookmakerEvents: [],
          bookmakerEvents: [],
          unmatchedBookmakerEvents: [],
        },
      });
    }

    if (parsed.hostname === 'ipbl-minimal-viewer.vercel.app' && parsed.pathname === '/api/recorder/status') {
      return jsonResponse({
        activeGameKeys: [`${productionRow.divisionTag}:${productionRow.gameId}`],
      });
    }

    if (parsed.hostname === 'ipbl-minimal-viewer.vercel.app' && parsed.pathname === '/api/recorder/history') {
      return jsonResponse({
        snapshots: [productionRow],
      });
    }

    if (parsed.hostname === 'melbet.com' && parsed.pathname === '/service-api/LiveFeed/Get1x2_VZip') {
      return jsonResponse({
        Value: [melbetEvent],
      });
    }

    if (parsed.hostname === 'melbet.com' && parsed.pathname === '/service-api/LiveFeed/GetHistoryGraphExt') {
      return jsonResponse(eventsstatFixture);
    }

    return jsonResponse({ ok: true, url: href });
  };
}
