import { fetchBookmakerLive } from "./bookmaker-live.js";

type MirrorProbeDependencies = {
  fetchBookmakerLive?: typeof fetchBookmakerLive;
};

function normalizeSourceFailures(value: unknown): Array<{ source?: string; leagueId?: number; kind?: string; error?: string }> {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") as Array<{ source?: string; leagueId?: number; kind?: string; error?: string }> : [];
}

export async function runMirrorProbe(deps: MirrorProbeDependencies = {}) {
  const probe = deps.fetchBookmakerLive ?? fetchBookmakerLive;
  try {
    const result = await probe();
    const sourceFailures = normalizeSourceFailures(result.sourceFailures);
    return {
      ok: sourceFailures.length === 0,
      games: result.games.map((game) => ({
        gameId: game.gameId,
        tag: game.tag,
        team1: game.team1.shortName,
        team2: game.team2.shortName,
        scoreText: game.scoreText,
      })),
      sourceFailures,
      receivedEvents: result.receivedEvents,
      sourceLeagues: result.sourceLeagues,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const sourceFailures = normalizeSourceFailures((error as Error & { sourceFailures?: unknown }).sourceFailures);
    return {
      ok: false,
      error: message,
      sourceFailures,
    };
  }
}
