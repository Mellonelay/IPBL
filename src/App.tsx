import { useBettingMemory } from "./hooks/useBettingMemory";
import { BettingMemoryDrawerSection } from "./components/BettingMemoryDrawerSection";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearFetchCaches,
  fetchBoxScore,
  fetchGame,
  fetchOnline,
  fetchTeamGames,
} from "./api/client";
import { computeH2H } from "./api/normalize";
import type { BoxScoreState, H2HEntry, ScheduleGame } from "./api/types";
import ResultsCalendarGrid from "./components/ResultsCalendarGrid";
import BettingRecord from "./components/BettingRecord";
import { canonicalDivisionLabel, LIVE_DIVISIONS, LIVE_DIVISION_TAGS } from "./config/divisions";
import { operatorSummary } from "./operator/data";
import {
  analyzeQuarterFlow,
  evaluateOperatorDecision,
  getScoreboardAnalysis,
  matchupKey,
  parseH2HQuarterMatrix,
  type OperatorDecision,
  type QuarterFlowAnalysis,
  type QuarterKey,
  type ScoreboardAnalysis,
} from "./operator/engine";
import {
  clearResultsCalendarCache,
  createSkeletonResultsCalendarMap,
  fetchResultsMonthFromApi,
  RESULTS_DIVISION_TAGS,
  type CalendarGridMap,
} from "./results/calendar";

type TabKey = "live" | "results" | "betting";

type LiveInsight = {
  game: ScheduleGame;
  board: ScoreboardAnalysis;
  flow: QuarterFlowAnalysis;
  decision: OperatorDecision;
  gameMeta: unknown | null;
  boxState: BoxScoreState | null;
};

type DrawerState = {
  game: ScheduleGame;
  gameMeta: unknown | null;
  boxState: BoxScoreState | null;
  board: ScoreboardAnalysis;
  flow: QuarterFlowAnalysis | null;
  decision: OperatorDecision;
  h2h: H2HEntry[];
  histLoading: boolean;
  detailErr: string | null;
};

const RESULTS_SEASON = 2026;
const RESULTS_START_YEAR = 2026;
const RESULTS_START_MONTH_INDEX = 2; // March (0-based)
const DEFAULT_RESULTS_DIVISION_TAG = "ipbl-66-m-pro-a";

function liveKey(game: ScheduleGame): string {
  return `${game.tag}:${game.gameId}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function devLog(...args: unknown[]): void {
  // Vite exposes DEV at build-time; keep logs out of production bundles.
  if (import.meta.env.DEV) console.debug("[ipbl]", ...args);
}

function devAssert(condition: unknown, message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (condition) return;
  console.error(`[ipbl][contract] ${message}`, detail ?? "");
  throw new Error(message);
}

function statusTone(value: "ALLOW" | "CAUTION" | "BLOCK"): string {
  return value.toLowerCase();
}

function gameDivision(game: ScheduleGame): "Men" | "Women" {
  return game.tag.includes("-w-") || game.team1.name.includes("(Women)") ? "Women" : "Men";
}

function currentOrNextQuarter(
  flow: QuarterFlowAnalysis | null,
  board: ScoreboardAnalysis
): QuarterKey | null {
  return flow?.nextQuarter ?? board.currentQuarter ?? null;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-box">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function LiveCard({
  insight,
  onOpen,
  onOpenH2H,
}: {
  insight: LiveInsight;
  onOpen: (insight: LiveInsight) => void;
  onOpenH2H: (insight: LiveInsight) => void;
}) {
  const { game, board, flow, decision } = insight;
  const currentQuarter = board.currentQuarter ?? (game.period ? `Q${game.period}` : "Live");
  const currentQuarterTotal = board.currentQuarterTotal ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â";

  return (
    <div className="operator-card">
      <button type="button" className="card-open-button" onClick={() => onOpen(insight)}>
        <div className="card-head">
          <div>
            <div className="card-title">
              {game.team1.shortName} vs {game.team2.shortName}
            </div>
            <div className="card-subtitle">
              {canonicalDivisionLabel(game.tag) ?? game.divisionLabel ?? game.tag}
            </div>
          </div>
          <span className={`decision-pill ${statusTone(decision.decision)}`}>{decision.decision}</span>
        </div>

        <div className="score-row">
          <div className="score-main">{game.scoreText || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"}</div>
          <div className="score-meta">
            <div>{currentQuarter}</div>
            <div>{game.timeToGo ?? board.quarterClock ?? "Clock ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"}</div>
          </div>
        </div>

        <div className="quarter-grid">
          <Metric label="Q1 total" value={board.quarterTotals.Q1 ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
          <Metric label="Q2 total" value={board.quarterTotals.Q2 ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
          <Metric label="Current quarter" value={currentQuarter} />
          <Metric label="Current total" value={currentQuarterTotal} />
        </div>

        <div className="bias-line">
          <strong>{decision.suggestedBias ?? "No bias"}</strong>
          <span>{flow.signal !== "NO_SIGNAL" ? flow.signal : "No strong flow signal yet"}</span>
        </div>
      </button>

      <div className="card-actions">
        <button
          type="button"
          className="mini-btn"
          data-testid="live-card-h2h-button"
          onClick={() => onOpenH2H(insight)}
        >
          H2H
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("results");
  const { data: liveGames = [], error } = useSWR\("/api/results/live", (url) => fetch(url).then(r => r.json()), { refreshInterval: 1000 });
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveInsights, setLiveInsights] = useState<Record<string, LiveInsight>>({});
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
  const [loadedResultsKey, setLoadedResultsKey] = useState<string | null>(null);
  const resultsLoadGenRef = useRef(0);

  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const resultsMonthOptions = useMemo(() => {
    // Extend by bumping `totalMonths`.
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

  const selectedMonthKey = `${selectedResultsYear}-${String(selectedResultsMonthIndex + 1).padStart(
    2,
    "0"
  )}`;

  const selectedResultsKey = `${selectedMonthKey}|${selectedResultsDivisionTag}`;

  const onSelectMonthKey = useCallback((value: string) => {
    const parts = value.split("-").map((p) => Number.parseInt(p, 10));
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
    const parts = value.split("-").map((p) => Number.parseInt(p, 10));
    if (parts.length !== 3 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return;
    setSelectedResultsYear(parts[0]);
    setSelectedResultsMonthIndex(parts[1] - 1);
  }, []);

  const displayLiveInsights = useMemo(
    () => {
      return liveGames
        .filter((game) => selectedLiveDivisionTag === "" || game.tag === selectedLiveDivisionTag)
        .map((game) => liveInsights[liveKey(game)])
        .filter(Boolean);
    },
    [liveGames, liveInsights, selectedLiveDivisionTag]
  );

  const menLive = useMemo(
    () => displayLiveInsights.filter((insight) => gameDivision(insight.game) === "Men"),
    [displayLiveInsights]
  );
  const womenLive = useMemo(
    () => displayLiveInsights.filter((insight) => gameDivision(insight.game) === "Women"),
    [displayLiveInsights]
  );

  // Dev-only acceptance checks (data contract).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
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
    if (!import.meta.env.DEV) return;
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
    if (tab === "results" || tab === "live") setActiveTab(tab);
    if (date) {
      setJumpDate(date);
      const parts = date.split("-").map((p) => Number.parseInt(p, 10));
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
    // Hard reset: do not show any cards until the current upstream refresh completes.
    setLiveGames([]);
    setLiveInsights({});
    setLiveErr(null);
    try {
      const gamesRaw: ScheduleGame[] = [];
      for (const division of LIVE_DIVISIONS) {
        try {
          const rows = await fetchOnline(division.tag);
          gamesRaw.push(...rows);
        } catch {
          /* skip failed division */
        }
      }
      const filtered = gamesRaw.filter((game) =>
        LIVE_DIVISION_TAGS.includes(game.tag as (typeof LIVE_DIVISION_TAGS)[number])
      );

      devLog("live-refresh", {
        approvedCount: LIVE_DIVISIONS.length,
        upstreamLiveCount: filtered.length,
      });

      // Enforce division label from our whitelist mapping.
      // Some upstream payloads use generic division labels (e.g. "Pro Division"),
      // so we must derive display label from the division tag we requested.
      const games = filtered.map((game) => {
        const divisionConfig = LIVE_DIVISIONS.find((d) => d.tag === game.tag);
        return {
          ...game,
          divisionLabel: divisionConfig?.label ?? game.divisionLabel,
        };
      });

      const insights = await Promise.all(
        games.map(async (game): Promise<[string, LiveInsight]> => {
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
        })
      );

      const nextInsights = Object.fromEntries(insights);
      // Debug: prove each card was produced from current upstream online rows.
      devLog(
        "live-cards-built",
        games.map((g) => ({
          identity: liveKey(g),
          source: "upstream-online",
          tag: g.tag,
          gameId: g.gameId,
          divisionLabel: g.divisionLabel,
        }))
      );

      // Hard replace after full rebuild.
      setLiveGames(games);
      setLiveInsights(nextInsights);
    } catch (error) {
      setLiveErr(error instanceof Error ? error.message : "Live load failed");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    const gen = (resultsLoadGenRef.current += 1);
    setCalendarMap(
      createSkeletonResultsCalendarMap(selectedResultsYear, selectedResultsMonthIndex, [
        selectedResultsDivisionTag,
      ])
    );
    setResultsLoading(true);
    setResultsErr(null);
    try {
      const map = await fetchResultsMonthFromApi({
        year: selectedResultsYear,
        monthIndex: selectedResultsMonthIndex,
        divisionTag: selectedResultsDivisionTag,
      });
      if (resultsLoadGenRef.current !== gen) return;
      setCalendarMap(map);
      setLoadedResultsKey(`${selectedMonthKey}|${selectedResultsDivisionTag}`);
    } catch (error) {
      if (resultsLoadGenRef.current === gen) {
        setResultsErr(error instanceof Error ? error.message : "Results load failed");
      }
    } finally {
      if (resultsLoadGenRef.current === gen) {
        setResultsLoading(false);
      }
    }
  }, [selectedResultsYear, selectedResultsMonthIndex, selectedResultsDivisionTag, selectedMonthKey]);

  useEffect(() => {
    if (activeTab !== "live") return;
    void loadLive();
    const id = window.setInterval(() => void loadLive(), 25_000);
    return () => window.clearInterval(id);
  }, [loadLive, activeTab]);

  useEffect(() => {
    if (activeTab !== "results") return;
    void loadResults();
  }, [loadResults, activeTab]);

  // Keep jump date inside the selected month.
  useEffect(() => {
    const mm = String(selectedResultsMonthIndex + 1).padStart(2, "0");
    const day = jumpDate.split("-")[2] ? Number.parseInt(jumpDate.split("-")[2], 10) : 1;
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
      board: presetBoard,
      flow: presetFlow,
      decision: presetDecision,
      h2h: [],
      histLoading: true,
      detailErr: null,
    });

    try {
      const [gameMeta, ha, hb, boxState] = await Promise.all([
        fetchGame(game.gameId, game.tag),
        fetchTeamGames(game.team1.teamId, game.tag, RESULTS_SEASON),
        fetchTeamGames(game.team2.teamId, game.tag, RESULTS_SEASON),
        fetchBoxScore(game.gameId, game.tag),
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
        board,
        flow,
        decision,
        h2h,
        histLoading: false,
        detailErr: !gameMeta.fetchedOk ? "Could not load game metadata." : null,
      });
    } catch (error) {
      setDrawer((current) =>
        current
          ? {
            ...current,
            histLoading: false,
            detailErr: error instanceof Error ? error.message : "Detail load failed",
          }
          : current
      );
    }
  }, []);

  return (
    <div className="console-shell">
      <header className="console-header">
        <div>
          <h1>IPBL Operator Console</h1>
          <p>Quarter-first live decisions plus a month-based results calendar browser.</p>
        </div>
        <button
          type="button"
          className="refresh-btn"
          onClick={() => {
            clearFetchCaches();
            clearResultsCalendarCache();
            if (activeTab === "live") void loadLive();
            if (activeTab === "results") void loadResults();
          }}
        >
          Refresh
        </button>
      </header>

      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          Live
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "results" ? "active" : ""}`}
          onClick={() => setActiveTab("results")}
        >
          Results
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "betting" ? "active" : ""}`}
          onClick={() => setActiveTab("betting")}
        >
          Betting Record
        </button>
      </div>

      {activeTab === "live" && (
        <section className="tab-panel">
          <div className="summary-strip">
            <Metric label="Win rate" value={formatPct(operatorSummary.overall.win_rate)} />
            <Metric label="Best quarter" value={operatorSummary.best_quarter.name} />
            <Metric label="Worst quarter" value={operatorSummary.worst_quarter.name} />
            <Metric label="Riskiest division" value={operatorSummary.worst_division.name} />
          </div>

          {liveErr && <p className="err">{liveErr}</p>}
          {liveLoading && <p className="muted">Refreshing live operator cardsÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦</p>}

          <div className="live-controls">
            <label>
              Division
              <select
                value={selectedLiveDivisionTag}
                onChange={(e) => setSelectedLiveDivisionTag(e.target.value)}
              >
                <option value="">All live divisions</option>
                {LIVE_DIVISIONS.map((division) => (
                  <option key={division.tag} value={division.tag}>
                    {division.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!liveLoading && liveGames.length === 0 && displayLiveInsights.length === 0 && (
            <p className="muted">No approved live games are active right now.</p>
          )}

          {!liveLoading && liveGames.length > 0 && displayLiveInsights.length === 0 && (
            <p className="muted">No live games match the selected division filters.</p>
          )}

          {menLive.length > 0 && (
            <section className="live-section-group">
              <h3 className="live-section-title">Men</h3>
              <div className="live-card-grid">
                {menLive.map((insight) => (
                  <LiveCard
                    key={liveKey(insight.game)}
                    insight={insight}
                    onOpen={(item) => void openDrawer(item.game, item)}
                    onOpenH2H={(item) => void openDrawer(item.game, item)}
                  />
                ))}
              </div>
            </section>
          )}

          {womenLive.length > 0 && (
            <section className="live-section-group">
              <h3 className="live-section-title">Women</h3>
              <div className="live-card-grid">
                {womenLive.map((insight) => (
                  <LiveCard
                    key={liveKey(insight.game)}
                    insight={insight}
                    onOpen={(item) => void openDrawer(item.game, item)}
                    onOpenH2H={(item) => void openDrawer(item.game, item)}
                  />
                ))}
              </div>
            </section>
          )}

        </section>
      )}

      {activeTab === "results" && (
        <ResultsCalendarGrid
          calendarMap={calendarMap}
          selectedDivisionTag={selectedResultsDivisionTag}
          selectedMonthKey={selectedMonthKey}
          onSelectMonthKey={onSelectMonthKey}
          monthOptions={resultsMonthOptions}
          jumpDate={jumpDate}
          loading={resultsLoading}
          error={resultsErr}
          onJumpDateChange={onJumpDateChange}
          onSelectDivision={setSelectedResultsDivisionTag}
          onOpenMatch={(game) => void openDrawer(game)}
          onOpenH2H={(game) => void openDrawer(game)}
        />
      )}

      {activeTab === "betting" && <BettingRecord />}

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(null)} role="presentation">
          <aside
            className="drawer"
            data-testid="game-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="close-btn" onClick={() => setDrawer(null)}>
              Close
            </button>

            <section className="drawer-section">
              <div className="drawer-head">
                <div>
                  <h2>
                    {drawer.game.team1.shortName} vs {drawer.game.team2.shortName}
                  </h2>
                  <div className="muted">
                    {canonicalDivisionLabel(drawer.game.tag) ??
                      drawer.game.divisionLabel ??
                      drawer.game.tag}{" "}
                    ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {drawer.game.localDate} {drawer.game.localTime}
                  </div>
                </div>
                <span
                  className={`status-badge ${drawer.game.isLive ? "status-online" : "status-finished"
                    }`}
                >
                  {drawer.game.statusDisplay}
                </span>
              </div>
            </section>

            <section className="drawer-section">
              <h3>Score block</h3>
              <div className="score-hero">{drawer.game.scoreText}</div>
              <div className="quarter-grid">
                <Metric label="Q1" value={drawer.board.quarterTotals.Q1 ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
                <Metric label="Q2" value={drawer.board.quarterTotals.Q2 ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
                <Metric label="Q3" value={drawer.board.quarterTotals.Q3 ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
                <Metric label="Q4" value={drawer.board.quarterTotals.Q4 ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
                <Metric label="1H" value={drawer.board.firstHalfTotal ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
                <Metric label="2H" value={drawer.board.secondHalfTotal ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
              </div>
            </section>

            <section className="drawer-section">
              <h3>Live decision block</h3>
              <div className={`decision-banner ${statusTone(drawer.decision.decision)}`}>
                {drawer.decision.decision}
              </div>
              <div className="decision-meta">
                <Metric label="Suggested bias" value={drawer.decision.suggestedBias ?? "No bias"} />
                <Metric label="Pace trend" value={drawer.flow?.paceTrend ?? "UNKNOWN"} />
                <Metric label="Q1 points" value={drawer.flow?.q1Points ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
                <Metric label="Q2 points" value={drawer.flow?.q2Points ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"} />
              </div>
              <p className="muted strong-line">
                Flow signal: {drawer.flow?.signal ?? "No live quarter signal"}
              </p>
              <ul className="reason-list">
                {drawer.decision.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </section>

            <section className="drawer-section">
              <h3>Historical risk block</h3>
              <div className="quarter-grid">
                <Metric
                  label={`Quarter ${currentOrNextQuarter(drawer.flow, drawer.board) ?? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"}`}
                  value={
                    drawer.decision.quarterContext
                      ? `${formatPct(drawer.decision.quarterContext.win_rate)} / ${formatCurrency(
                        drawer.decision.quarterContext.net_profit
                      )}`
                      : "No quarter context"
                  }
                />
                <Metric
                  label={`${gameDivision(drawer.game)} context`}
                  value={`${formatPct(drawer.decision.divisionContext?.win_rate ?? 0)} / ${formatCurrency(
                    drawer.decision.divisionContext?.net_profit ?? 0
                  )}`}
                />
                <Metric
                  label="Odds band"
                  value={
                    drawer.decision.oddsContext
                      ? `${formatPct(drawer.decision.oddsContext.win_rate)} / ${formatCurrency(
                        drawer.decision.oddsContext.net_profit
                      )}`
                      : "No odds context"
                  }
                />
              </div>
              <p className="muted">{operatorSummary.theory_call}</p>
            </section>

            <section className="drawer-section" data-testid="h2h-section">
              <h3>H2H block</h3>
              {drawer.histLoading && (
                <p className="muted" data-testid="h2h-loading">
                  Loading historyÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦
                </p>
              )}
              {!drawer.histLoading && drawer.h2h.length === 0 && (
                <p className="muted">
                  <span data-testid="no-prior-meetings-label">No prior meetings</span> in loaded team histories.
                </p>
              )}
              <div className="h2h-list" data-testid="h2h-list">
                {drawer.h2h.map((entry) => {
                  const matrix = parseH2HQuarterMatrix(entry.fullScore);
                  return (
                    <div key={entry.gameId} className="h2h-item" data-testid="h2h-item">
                      <div>
                        {entry.date} {entry.time} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {entry.scoreText}
                      </div>
                      <div className="muted">
                        {matrix.length > 0
                          ? matrix.map((value, index) => `Q${index + 1} ${value}`).join(" ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ")
                          : entry.fullScore || "No quarter matrix"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="drawer-section">
              <h3>Team risk block</h3>
              {drawer.decision.teamFlags.length === 0 && (
                <p className="muted">Neither team is on the strongest or weakest watchlists.</p>
              )}
              {drawer.decision.teamFlags.map((flag) => {
                const tone = operatorSummary.team_risk.worst_teams.some(
                  (entry) => entry.team === flag.team
                )
                  ? "bad"
                  : "good";
                return (
                  <div key={flag.team} className={`risk-row ${tone}`}>
                    <strong>{flag.team}</strong>
                    <span>
                      {formatPct(flag.win_rate)} win rate ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {formatCurrency(flag.net_profit)}
                    </span>
                  </div>
                );
              })}
            </section>

            <section className="drawer-section">
              <h3>Matchup risk block</h3>
              {drawer.decision.matchupFlag ? (
                <div className="risk-row bad">
                  <strong>{drawer.decision.matchupFlag.matchup}</strong>
                  <span>
                    {formatPct(drawer.decision.matchupFlag.win_rate)} win rate ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·{" "}
                    {formatCurrency(drawer.decision.matchupFlag.net_profit)}
                  </span>
                </div>
              ) : (
                <div className="risk-row neutral">
                  <strong>{matchupKey(drawer.game.team1.shortName, drawer.game.team2.shortName)}</strong>
                  <span>No flagged matchup risk in imported history.</span>
                </div>
              )}
              {drawer.detailErr && <p className="err">{drawer.detailErr}</p>}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;

