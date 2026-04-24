import type { DivisionGroup } from "../config/divisions";

export type GameStatusKind = "Online" | "Result" | "Scheduled" | string;

export type TeamRef = {
    teamId: number;
    shortName: string;
    name: string;
};

export type ScheduleGame = {
    gameId: number;
    tag: string;
    status: GameStatusKind;
    statusDisplay: string;
    upstreamStatusId: string | null;
    score1: number;
    score2: number;
    scoreText: string;
    fullScore: string | null;
    localDate: string;
    localTime: string;
    divisionLabel: string;
    period: number | null;
    timeToGo: string | null;
    isLive: boolean;
    team1: TeamRef;
    team2: TeamRef;
};

export type LiveGame = ScheduleGame;

export type H2HEntry = {
    gameId: number;
    date: string;
    time: string;
    scoreText: string;
    fullScore: string | null;
    status: GameStatusKind;
    winner: 0 | 1 | 2;
    homeTeamId: number;
    awayTeamId: number;
};

export type TeamHistoryGame = {
    gameId: number;
    scheduledTime: string;
    localDate: string;
    localTime: string;
    status: GameStatusKind;
    scoreText: string;
    fullScore: string | null;
    team1: TeamRef;
    team2: TeamRef;
    tag: string;
};

export type GameDetail = {
    raw: unknown;
    fetchedOk: boolean;
};

export type BoxScoreState = {
    raw: unknown | null;
    apiStatus: string | null;
    fetchedOk: boolean;
    fetchedAt: number;
};

export type DivisionSection = {
    config: { label: string; tag: string; group: DivisionGroup };
    games: ScheduleGame[];
    error: string | null;
    loading: boolean;
};
