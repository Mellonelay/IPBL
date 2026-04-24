import type { BoxScoreState, H2HEntry, ScheduleGame } from "../api/types";
import { analyzeQuarterFlow, evaluateOperatorDecision, getScoreboardAnalysis, type OperatorDecision, type QuarterFlowAnalysis, type ScoreboardAnalysis } from "./engine";

export type MockInsight = {
    game: ScheduleGame;
    board: ScoreboardAnalysis;
    flow: QuarterFlowAnalysis;
    decision: OperatorDecision;
    gameMeta: unknown;
    boxState: BoxScoreState;
    h2h: H2HEntry[];
    isDemo: true;
};

const demoGameMeta = {
    data: {
        result: {
            live: {
                periods: "10,10,10,10",
                currentMinute: 6,
                currentSecond: 14,
            },
        },
    },
};

const demoBoxRaw = {
    data: {
        status: "Ok",
        result: {
            scoreByPeriods: [
                { score1: 28, score2: 24 },
                { score1: 20, score2: 18 },
            ],
        },
    },
};

function makeLiveGame(overrides: Partial<ScheduleGame>): ScheduleGame {
    return {
        gameId: -1001,
        tag: "ipbl-66-m-pro-a",
        status: "Online",
        statusDisplay: "Live",
        score1: 61,
        score2: 55,
        scoreText: "61 : 55",
        fullScore: "28:24,20:18",
        localDate: "31.03.2026",
        localTime: "18:30",
        divisionLabel: "Pro Men A",
        team1: { teamId: 9001, shortName: "Murino", name: "Murino" },
        team2: { teamId: 9002, shortName: "Vladivostok", name: "Vladivostok" },
        ...overrides,
    };
}

function makeResultGame(overrides: Partial<ScheduleGame>): ScheduleGame {
    return {
        gameId: -2001,
        tag: "ipbl-66-w-pro-b",
        status: "Result",
        statusDisplay: "Finished",
        score1: 82,
        score2: 76,
        scoreText: "82 : 76",
        fullScore: "22:18,19:20,20:17,21:21",
        localDate: "30.03.2026",
        localTime: "14:00",
        divisionLabel: "Pro Women B",
        team1: { teamId: 9101, shortName: "Kazan", name: "Kazan (Women)" },
        team2: { teamId: 9102, shortName: "Samara", name: "Samara (Women)" },
        ...overrides,
    };
}

const liveDemoGame = makeLiveGame({});
const resultDemoGame = makeResultGame({});

const demoH2H: H2HEntry[] = [
    {
        gameId: -5001,
        date: "29.03.2026",
        time: "17:00",
        scoreText: "74 : 70",
        fullScore: "19:18,16:14,20:19,19:19",
        status: "Result",
        winner: 1,
        homeTeamId: liveDemoGame.team1.teamId,
        awayTeamId: liveDemoGame.team2.teamId,
    },
    {
        gameId: -5002,
        date: "27.03.2026",
        time: "16:00",
        scoreText: "68 : 72",
        fullScore: "15:20,18:17,16:19,19:16",
        status: "Result",
        winner: 2,
        homeTeamId: liveDemoGame.team1.teamId,
        awayTeamId: liveDemoGame.team2.teamId,
    },
];

function buildInsight(game: ScheduleGame, gameMeta: unknown, boxRaw: unknown, h2h: H2HEntry[]): MockInsight {
    const boxState: BoxScoreState = {
        raw: boxRaw,
        apiStatus: "Ok",
        fetchedOk: true,
        fetchedAt: Date.now(),
    };
    const board = getScoreboardAnalysis(game, boxRaw, gameMeta);
    const flow = analyzeQuarterFlow(game, boxRaw, gameMeta);
    const decision = evaluateOperatorDecision({
        quarter: flow.nextQuarter ?? board.currentQuarter,
        division: game.tag.includes("-w-") ? "Women" : "Men",
        hour: 18,
        team1: game.team1.shortName,
        team2: game.team2.shortName,
        flow,
    });
    return {
        game,
        board,
        flow,
        decision,
        gameMeta,
        boxState,
        h2h,
        isDemo: true,
    };
}

export const demoLiveInsight = buildInsight(liveDemoGame, demoGameMeta, demoBoxRaw, demoH2H);
export const demoResultInsight = buildInsight(
    resultDemoGame,
    { data: { result: { live: { periods: "10,10,10,10" } } } },
    {
        data: {
            status: "Ok",
            result: {
                scoreByPeriods: [
                    { score1: 22, score2: 18 },
                    { score1: 19, score2: 20 },
                    { score1: 20, score2: 17 },
                    { score1: 21, score2: 21 },
                ],
            },
        },
    },
    [
        {
            gameId: -5003,
            date: "25.03.2026",
            time: "12:00",
            scoreText: "77 : 74",
            fullScore: "20:17,18:21,22:16,17:20",
            status: "Result",
            winner: 1,
            homeTeamId: resultDemoGame.team1.teamId,
            awayTeamId: resultDemoGame.team2.teamId,
        },
    ]
);
