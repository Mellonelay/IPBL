import { describe, it, expect } from "vitest";
import { normalizeCalendarRow } from "./normalize.js";

describe("normalizeCalendarRow", () => {
  it("returns null if game.id is missing", () => {
    const item = { game: {} };
    expect(normalizeCalendarRow(item, "TEST")).toBeNull();
  });

  it("parses a standard valid game object (Happy Path)", () => {
    const item = {
      game: {
        id: 12345,
        gameStatus: "Final",
        score1: 2,
        score2: 1,
        score: "2:1",
        fullScore: "2:1 (1:0, 1:1)",
        localDate: "2023-10-25",
        localTime: "15:00",
        period: 3,
        timeToGo: "00:00"
      },
      team1: { teamId: 1, shortName: "T1", name: "Team 1" },
      team2: { teamId: 2, shortName: "T2", name: "Team 2" },
      status: { id: "FINISHED", displayName: "Finished" },
      division: "Div A",
    };

    const result = normalizeCalendarRow(item, "TEST");

    expect(result).toEqual({
      gameId: 12345,
      tag: "TEST",
      status: "Final",
      statusDisplay: "Finished",
      upstreamStatusId: "FINISHED",
      score1: 2,
      score2: 1,
      scoreText: "2 : 1",
      fullScore: "2:1 (1:0, 1:1)",
      localDate: "2023-10-25",
      localTime: "15:00",
      divisionLabel: "Div A",
      period: 3,
      timeToGo: "00:00",
      isLive: false,
      team1: { teamId: 1, shortName: "T1", name: "Team 1" },
      team2: { teamId: 2, shortName: "T2", name: "Team 2" }
    });
  });

  it("handles missing team fallbacks", () => {
    const item = {
      game: { id: 123 }
    };
    const result = normalizeCalendarRow(item, "TEST");
    expect(result?.team1).toEqual({ teamId: 0, shortName: "?", name: "?" });
    expect(result?.team2).toEqual({ teamId: 0, shortName: "?", name: "?" });
  });

  it("falls back status when missing", () => {
    const item = {
      game: { id: 123 }
    };
    const result = normalizeCalendarRow(item, "TEST");
    expect(result?.status).toBe("Unknown");
    expect(result?.statusDisplay).toBe("Unknown");
    expect(result?.upstreamStatusId).toBeNull();
  });

  it("prefers item properties for period and timeToGo", () => {
    const item = {
      game: { id: 123, period: 1, timeToGo: "10:00" },
      period: 2,
      timeToGo: "05:00"
    };
    const result = normalizeCalendarRow(item, "TEST");
    expect(result?.period).toBe(2);
    expect(result?.timeToGo).toBe("05:00");
  });

  it("formats score properly without explicit score string", () => {
    const item = {
      game: { id: 123, score1: 3, score2: 0 }
    };
    const result = normalizeCalendarRow(item, "TEST");
    expect(result?.scoreText).toBe("3 : 0");
  });

  it("identifies a live game correctly", () => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // e.g. "2024-04-24"
    const item = {
      game: {
        id: 123,
        gameStatus: "Live",
        localDate: dateStr,
        score1: 1,
        score2: 0
      },
      timeToGo: "12:34"
    };
    const result = normalizeCalendarRow(item, "TEST");
    expect(result?.isLive).toBe(true);
  });
});
