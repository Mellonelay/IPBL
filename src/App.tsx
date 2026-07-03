// // import { useBettingMemory } from "./hooks/useBettingMemory";
// // import { BettingMemoryDrawerSection } from "./components/BettingMemoryDrawerSection";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearFetchCaches,
  fetchBoxScore,
  fetchGame,
  fetchGameReplay,
  // fetchOnline,
  fetchTeamGames,
} from "./api/client";
import { computeH2H } from "./api/normalize";
import type { ScheduleGame } from "./api/types";
import { buildLiveDisplayInsights } from "./live/display";
import { summarizeBookmakerFailures } from "./live/source-status";
import { LIVE_DIVISION_TAGS } from "./config/divisions";
import {
  analyzeQuarterFlow,
  evaluateOperatorDecision,
  getScoreboardAnalysis,
} from "./operator/engine";
import {
  clearResultsCalendarCache,
  createSkeletonResultsCalendarMap,
  fetchResultsMonthPayloadFromApi,
  resultsDivisionsForMonth,
  RESULTS_DIVISION_TAGS,
  RESULTS_REFRESH_INTERVAL_MS,
  type CalendarGridMap,
  type ResultsMonthMetadata,
} from "./results/calendar";
import BettingTab from "./app/BettingTab";
import GameDrawer from "./app/GameDrawer";
import LiveTab from "./app/LiveTab";
import ResultsTab from "./app/ResultsTab";
import TeamsTab from "./app/TeamsTab";
import type { DrawerState, LiveInsight, LiveSourceFailure, TabKey } from "./app/app-types";
import { currentOrNextQuarter, gameDivision, liveKey } from "./app/shared";

function safeSplit(value: unknown, delimiter: string): string[] {
  return typeof value === "string" ? value.split(delimiter) : [];
}

const RESULTS_SEASON = 2026;
const RESULTS_START_YEAR = 2026;
const RESULTS_START_MONTH_INDEX = 2; // March (0-based)
const DEFAULT_RESULTS_DIVISION_TAG = "ipbl-66-m-pro-a";

function devAssert(condition: unknown, message: string, detail?: unknown): void {
  if (!((import.meta as any).env as any).DEV) return;
  if (condition) return;
  console.error(`[ipbl][contract] ${message}`, detail ?? "");
  throw new Error(message);
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("results");
  const [liveGames, setLiveGames] = useState<ScheduleGame[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveInsights, setLiveInsights] = useState<Record<string, LiveInsight>>({});
  const [liveSourceFailures, setLiveSourceFailures] = useState<LiveSourceFailure[]>([]);
  const [selectedLiveDivisionTag, setSelectedLiveDivisionTag] = useState("");

  const [selectedResultsYear, setSelectedResultsYear] = useState<number>(RESULTS_START_YEAR);
  const [selectedResultsMonthIndex, setSelectedResultsMonthIndex] = useState<number>(
    RESULTS_START_MONTH_INDEX
  );
  const [selectedResultsDivisionTag, setSelectedResultsDivisionTag] = useState(
    DEFAULT_RESULTS_DIVISION_TAG
  );
  const [jumpDate, setJumpDate] = useState<string>(() => `${RESULTS_START_YEAR}-03-01`);

  const [calendarMap, setCalendarMap] = useState<CalendarGridMap>(() =>
    createSkeletonResultsCalendarMap(RESULTS_START_YEAR, RESULTS_START_MONTH_INDEX, [
      DEFAULT_RESULTS_DIVISION_TAG,
    ])
  );
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsErr, setResultsErr] = useState<string | null>(null);
  const [resultsMetadata, setResultsMetadata] = useState<ResultsMonthMetadata | null>(null);
  const [loadedResultsKey, setLoadedResultsKey] = useState<string | null>(null);
  const resultsLoadGenRef = useRef(0);

  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [teamRefreshToken, setTeamRefreshToken] = useState(0);

  const selectedMonthKey = `${selectedResultsYear}-${String(selectedResultsMonthIndex + 1).padStart(
    2,
    "0"
  )}`;
  const selectedResultsKey = `${selectedMonthKey}|${selectedResultsDivisionTag}`;

  const activeTabLabel: Record<TabKey, string> = {
    live: "Live",
    results: "Results",
    teams: "Teams",
    betting: "Betting Record",
  };

  const activeTabDetail: Record<TabKey, string> = {
    live: liveLoading
      ? "Refreshing live operator cards."
      : liveGames.length > 0
        ? `${liveGames.length} live game${liveGames.length === 1 ? "" : "s"} loaded.`
        : "No live games are currently active.",
    results: resultsLoading
      ? "Reloading stored results and calendar evidence."
      : resultsMetadata?.status === "source_unavailable"
        ? "Stored results are intact, but the source was unavailable during the latest sync."
        : `Results month ${selectedMonthKey} is ready for drill-in.`,
    teams: "Team statistics stays centered on verified histories and quarter movement.",
    betting: "Betting record stays aligned to the date-scoped memory ledger.",
  };

  const liveSourceSummary = summarizeBookmakerFailures(liveSourceFailures);
  const liveSourceLabel = liveErr
    ? liveErr
    : liveLoading
      ? "Loading live feed"
      : liveSourceSummary || "Live feed healthy";
  const resultsLabel = resultsErr
    ? resultsErr
    : resultsLoading
      ? "Refreshing results cache"
      : resultsMetadata
        ? resultsMetadata.status === "source_unavailable"
          ? "Results cached with source gaps"
          : "Results cache current"
        : "Results cache warming";
  const focusLabel =
    activeTab === "live"
      ? selectedLiveDivisionTag || "All live divisions"
      : activeTab === "results"
        ? selectedResultsDivisionTag
        : activeTab === "teams"
          ? "Team statistics"
          : "Betting memory";

  const resultsMonthOptions = useMemo(() => {
    const totalMonths = 12;
    const out: Array<{ value: string; label: string }> = [];
    let year = RESULTS_START_YEAR;
    let monthIndex = RESULTS_START_MONTH_INDEX;
    for (let i = 0; i < totalMonths; i += 1) {
      const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const label = new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      out.push({ value, label });

      monthIndex += 1;
      if (monthIndex >= 12) {
        monthIndex = 0;
        year += 1;
      }
    }
    return out;
  }, []);

  const onSelectMonthKey = useCallback((value: string) => {
    const parts = safeSplit(value, "-").map((p) => Number.parseInt(p, 10));
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return;
    const nextYear = parts[0];
    const nextMonthIndex = parts[1] - 1;
    setSelectedResultsYear(nextYear);
    setSelectedResultsMonthIndex(nextMonthIndex);

    const mm = String(parts[1]).padStart(2, "0");
    setJumpDate(`${nextYear}-${mm}-01`);
  }, []);

  const onJumpDateChange = useCallback((value: string) => {
    setJumpDate(value);
    const parts = safeSplit(value, "-").map((p) => Number.parseInt(p, 10));
    if (parts.length !== 3 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return;
    setSelectedResultsYear(parts[0]);
    setSelectedResultsMonthIndex(parts[1] - 1);
  }, []);

  const displayLiveInsights = useMemo(
    () =>
      buildLiveDisplayInsights({
        games: liveGames,
        insights: liveInsights,
        selectedDivisionTag: selectedLiveDivisionTag,
        keyForGame: liveKey,
      }),
    [liveGames, liveInsights, selectedLiveDivisionTag]
  );

  useEffect(() => {
    if (!((import.meta as any).env as any).DEV) return;
    if (liveLoading) return;
    for (const insight of displayLiveInsights) {
      devAssert(
        LIVE_DIVISION_TAGS.includes(insight.game.tag as (typeof LIVE_DIVISION_TAGS)[number]),
        "Live rendered outside approved division tags",
        { tag: insight.game.tag, gameId: insight.game.gameId }
      );
      if (selectedLiveDivisionTag) {
        devAssert(insight.game.tag === selectedLiveDivisionTag, "Live division filter drift", {
          expected: selectedLiveDivisionTag,
          got: insight.game.tag,
          gameId: insight.game.gameId,
        });
      }
      devAssert(
        typeof insight.game.divisionLabel === "string" && insight.game.divisionLabel.startsWith("Pro "),
        "Live division label must be canonical (derived from mapping)",
        { tag: insight.game.tag, divisionLabel: insight.game.divisionLabel }
      );
    }
  }, [displayLiveInsights, selectedLiveDivisionTag, liveLoading]);

  useEffect(() => {
    if (!((import.meta as any).env as any).DEV) return;
    if (resultsLoading) return;
    if (loadedResultsKey !== selectedResultsKey) return;
    for (const [day, divisions] of Object.entries(calendarMap)) {
      devAssert(/^\d{4}-\d{2}-\d{2}$/.test(day), "Results day keys must be canonical YYYY-MM-DD", { day });
      for (const division of divisions) {
        for (const game of division.games) {
          devAssert(
            game.division.startsWith("Pro "),
            "Results rendered division label must be canonical (no placeholders)",
            { day, divisionTag: division.divisionTag, label: game.division }
          );
          devAssert(game.division !== "Division", "Results must not render placeholder 'Division'", {
            day,
            divisionTag: division.divisionTag,
          });
          devAssert(
            division.divisionTag === selectedResultsDivisionTag,
            "Results division filter drift",
            { expected: selectedResultsDivisionTag, got: division.divisionTag, day }
          );
        }
      }
    }
  }, [calendarMap, loadedResultsKey, resultsLoading, selectedResultsDivisionTag, selectedResultsKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const date = params.get("date");
    const division = params.get("division");
    if (tab === "results" || tab === "live" || tab === "teams" || tab === "betting") setActiveTab(tab);
    if (date) {
      setJumpDate(date);
      const parts = safeSplit(date, "-").map((p) => Number.parseInt(p, 10));
      if (parts.length === 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        setSelectedResultsYear(parts[0]);
        setSelectedResultsMonthIndex(parts[1] - 1);
      }
    }
    if (division && (RESULTS_DIVISION_TAGS as readonly string[]).includes(division)) {
      setSelectedResultsDivisionTag(division);
    }
  }, []);

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveErr(null);
    try {
      const res = await fetch("/api/results/live");
      if (!res.ok) throw new Error(`Live API error: ${res.status}`);
      const body = (await res.json()) as {
        games: ScheduleGame[];
        status: { bookmakerSourceFailures?: LiveSourceFailure[] };
      };
      const games = body.games || [];

      setLiveGames(games);
      setLiveSourceFailures(Array.isArray(body.status?.bookmakerSourceFailures) ? body.status.bookmakerSourceFailures : []);

      const insights = await Promise.all(
        (Array.isArray(games) ? games : []).map(async (game): Promise<[string, LiveInsight]> => {
          try {
            const [gameMeta, boxState] = await Promise.all([
              fetchGame(game.gameId, game.tag),
              fetchBoxScore(game.gameId, game.tag),
            ]);
            const boxRaw = boxState.fetchedOk ? boxState.raw : null;
            const board = getScoreboardAnalysis(game, boxRaw, gameMeta.raw);
            const flow = analyzeQuarterFlow(game, boxRaw, gameMeta.raw);
            const decision = evaluateOperatorDecision({
              quarter: currentOrNextQuarter(flow, board),
              division: gameDivision(game),
              hour: new Date().getHours(),
              team1: game.team1.shortName,
              team2: game.team2.shortName,
              flow,
            });

            return [
              liveKey(game),
              {
                game,
                board,
                flow,
                decision,
                gameMeta: gameMeta.raw,
                boxState,
              },
            ];
          } catch {
            const board = getScoreboardAnalysis(game, null, null);
            return [
              liveKey(game),
              {
                game,
                board,
                flow: {
                  signal: "NO_SIGNAL",
                  q1Points: null,
                  q2Points: null,
                  paceTrend: "UNKNOWN",
                  q1Pace: null,
                  q2Pace: null,
                  suggestedBias: null,
                  liveAdjustment: 0,
                  nextQuarter: null,
                },
                decision: {
                  decision: "CAUTION",
                  reasons: ["Insight fetch failed"],
                  suggestedBias: null,
                  score: 0,
                  quarterContext: null,
                  divisionContext: null,
                  oddsContext: null,
                  matchupFlag: null,
                  teamFlags: [],
                  flow: null,
                },
                gameMeta: null,
                boxState: null,
              },
            ];
          }
        })
      );

      setLiveInsights(Object.fromEntries(insights));
    } catch (error) {
      setLiveSourceFailures([]);
      setLiveErr(error instanceof Error ? error.message : "Live load failed");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const loadResults = useCallback(
    async (options: { silent?: boolean; force?: boolean } = {}) => {
      const gen = (resultsLoadGenRef.current += 1);
      if (!options.silent) {
        setCalendarMap(
          createSkeletonResultsCalendarMap(RESULTS_START_YEAR, RESULTS_START_MONTH_INDEX, [
            DEFAULT_RESULTS_DIVISION_TAG,
          ])
        );
        setResultsMetadata(null);
        setResultsLoading(true);
      }
      setResultsErr(null);
      try {
        const payload = await fetchResultsMonthPayloadFromApi({
          year: selectedResultsYear,
          monthIndex: selectedResultsMonthIndex,
          divisionTag: selectedResultsDivisionTag,
          force: options.force,
        });
        if (resultsLoadGenRef.current !== gen) return;
        setCalendarMap(payload.calendar);
        setResultsMetadata(payload.meta);
        setLoadedResultsKey(`${selectedMonthKey}|${selectedResultsDivisionTag}`);
      } catch (error) {
        if (resultsLoadGenRef.current === gen) {
          setResultsErr(error instanceof Error ? error.message : "Results load failed");
        }
      } finally {
        if (!options.silent && resultsLoadGenRef.current === gen) {
          setResultsLoading(false);
        }
      }
    },
    [selectedResultsYear, selectedResultsMonthIndex, selectedResultsDivisionTag, selectedMonthKey]
  );

  useEffect(() => {
    if (activeTab !== "live") return;
    void loadLive();
    const id = window.setInterval(() => void loadLive(), 25_000);
    return () => window.clearInterval(id);
  }, [loadLive, activeTab]);

  useEffect(() => {
    if (activeTab !== "results") return;
    void loadResults();
    const id = window.setInterval(() => void loadResults({ silent: true, force: true }), RESULTS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadResults, activeTab]);

  useEffect(() => {
    const valid = resultsDivisionsForMonth(selectedResultsYear, selectedResultsMonthIndex);
    if (!valid.some((division) => division.tag === selectedResultsDivisionTag) && valid[0]) {
      setSelectedResultsDivisionTag(valid[0].tag);
    }
  }, [selectedResultsYear, selectedResultsMonthIndex, selectedResultsDivisionTag]);

  useEffect(() => {
    const mm = String(selectedResultsMonthIndex + 1).padStart(2, "0");
    const day = safeSplit(jumpDate, "-")[2] ? Number.parseInt(safeSplit(jumpDate, "-")[2], 10) : 1;
    const maxDay = new Date(selectedResultsYear, selectedResultsMonthIndex + 1, 0).getDate();
    const safeDay = Number.isFinite(day) ? Math.min(maxDay, Math.max(1, day)) : 1;
    const nextJump = `${selectedResultsYear}-${mm}-${String(safeDay).padStart(2, "0")}`;
    if (jumpDate !== nextJump) setJumpDate(nextJump);
  }, [selectedResultsYear, selectedResultsMonthIndex, jumpDate]);

  const openDrawer = useCallback(async (game: ScheduleGame, preset?: LiveInsight) => {
    const presetBoard = preset?.board ?? getScoreboardAnalysis(game, null, null);
    const presetFlow = preset?.flow ?? null;
    const presetDecision =
      preset?.decision ??
      evaluateOperatorDecision({
        quarter: currentOrNextQuarter(presetFlow, presetBoard),
        division: gameDivision(game),
        hour: new Date().getHours(),
        team1: game.team1.shortName,
        team2: game.team2.shortName,
        flow: presetFlow,
      });

    setDrawer({
      game,
      gameMeta: preset?.gameMeta ?? null,
      boxState: preset?.boxState ?? null,
      replay: null,
      board: presetBoard,
      flow: presetFlow,
      decision: presetDecision,
      h2h: [],
      histLoading: true,
      replayLoading: true,
      replayErr: null,
      detailErr: null,
    });

    try {
      let replayErr: string | null = null;
      const replayPromise = fetchGameReplay(game.gameId).catch((error) => {
        replayErr = error instanceof Error ? error.message : "Replay load failed";
        return null;
      });
      const [gameMeta, ha, hb, boxState, replay] = await Promise.all([
        fetchGame(game.gameId, game.tag),
        fetchTeamGames(game.team1.teamId, game.tag, RESULTS_SEASON),
        fetchTeamGames(game.team2.teamId, game.tag, RESULTS_SEASON),
        fetchBoxScore(game.gameId, game.tag),
        replayPromise,
      ]);

      const boxRaw = boxState.fetchedOk ? boxState.raw : null;
      const board = getScoreboardAnalysis(game, boxRaw, gameMeta.raw);
      const flow = game.isLive ? analyzeQuarterFlow(game, boxRaw, gameMeta.raw) : null;
      const decision = evaluateOperatorDecision({
        quarter: currentOrNextQuarter(flow, board),
        division: gameDivision(game),
        hour: new Date().getHours(),
        team1: game.team1.shortName,
        team2: game.team2.shortName,
        flow,
      });
      const h2h = computeH2H(ha, hb, game.team1.teamId, game.team2.teamId, 15);

      setDrawer({
        game,
        gameMeta: gameMeta.raw,
        boxState,
        replay,
        board,
        flow,
        decision,
        h2h,
        histLoading: false,
        replayLoading: false,
        replayErr,
        detailErr: !gameMeta.fetchedOk ? "Could not load game metadata." : null,
      });
    } catch (error) {
      setDrawer((current) =>
        current
          ? {
              ...current,
              histLoading: false,
              replayLoading: false,
              replayErr: error instanceof Error ? error.message : "Replay load failed",
              detailErr: error instanceof Error ? error.message : "Detail load failed",
            }
          : current
      );
    }
  }, []);

  return (
    <div className="console-shell">
      <header className="console-header">
        <div className="console-hero-copy">
          <p className="console-eyebrow">IPBL operator console</p>
          <h1>Quarter-first live decisions, historical evidence, and betting memory in one place.</h1>
          <p>
            The live feed remains the center of gravity. Results, teams, and betting memory stay available as
            supporting surfaces instead of competing with the operator flow.
          </p>
        </div>
        <div className="console-hero-actions">
          <div className="console-focus-chip">Focus: {focusLabel}</div>
          <button
            type="button"
            className="refresh-btn"
            onClick={() => {
              clearFetchCaches();
              clearResultsCalendarCache();
              if (activeTab === "live") void loadLive();
              if (activeTab === "results") void loadResults({ force: true });
              if (activeTab === "teams") setTeamRefreshToken((value) => value + 1);
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="console-status-grid" aria-label="system status">
        <article className="status-card status-card-live">
          <span className="status-card-label">Live feed</span>
          <strong>{liveGames.length > 0 ? `${liveGames.length} active game${liveGames.length === 1 ? "" : "s"}` : "Idle"}</strong>
          <span>{liveSourceLabel}</span>
        </article>
        <article className="status-card status-card-results">
          <span className="status-card-label">Results cache</span>
          <strong>{selectedMonthKey}</strong>
          <span>{resultsLabel}</span>
        </article>
        <article className="status-card status-card-scope">
          <span className="status-card-label">Active view</span>
          <strong>{activeTabLabel[activeTab]}</strong>
          <span>{activeTabDetail[activeTab]}</span>
        </article>
      </section>

      <nav className="tab-row" aria-label="Primary tabs">
        <button type="button" className={`tab-btn ${activeTab === "live" ? "active" : ""}`} onClick={() => setActiveTab("live")}>
          Live
        </button>
        <button type="button" className={`tab-btn ${activeTab === "results" ? "active" : ""}`} onClick={() => setActiveTab("results")}>
          Results
        </button>
        <button type="button" className={`tab-btn ${activeTab === "teams" ? "active" : ""}`} onClick={() => setActiveTab("teams")}>
          Teams
        </button>
        <button type="button" className={`tab-btn ${activeTab === "betting" ? "active" : ""}`} onClick={() => setActiveTab("betting")}>
          Betting Record
        </button>
      </nav>

      <main className="console-stage">
        {activeTab === "live" && (
          <LiveTab
            liveGames={liveGames}
            liveInsights={liveInsights}
            liveLoading={liveLoading}
            liveErr={liveErr}
            liveSourceFailures={liveSourceFailures}
            selectedLiveDivisionTag={selectedLiveDivisionTag}
            onSelectDivisionTag={setSelectedLiveDivisionTag}
            onOpenGame={(game, insight) => void openDrawer(game, insight)}
            onOpenH2H={(game, insight) => void openDrawer(game, insight)}
          />
        )}

        {activeTab === "results" && (
          <ResultsTab
            calendarMap={calendarMap}
            selectedDivisionTag={selectedResultsDivisionTag}
            selectedMonthKey={selectedMonthKey}
            onSelectMonthKey={onSelectMonthKey}
            monthOptions={resultsMonthOptions}
            jumpDate={jumpDate}
            loading={resultsLoading}
            error={resultsErr}
            metadata={resultsMetadata}
            onJumpDateChange={onJumpDateChange}
            onSelectDivision={setSelectedResultsDivisionTag}
            onOpenMatch={(game) => void openDrawer(game)}
            onOpenH2H={(game) => void openDrawer(game)}
          />
        )}

        {activeTab === "teams" && (
          <TeamsTab season={RESULTS_SEASON} refreshToken={teamRefreshToken} onOpenGame={(game) => void openDrawer(game)} />
        )}

        {activeTab === "betting" && <BettingTab />}
      </main>

      {drawer && <GameDrawer drawer={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

export default App;
