import { describe, it, expect } from "vitest";
import { isCalendarMapCompleteForMonth, type CalendarGridMap } from "../calendar";

// Need to mock monthDayKeys behavior indirectly by providing a specific year/month
// 2024 (Leap year), monthIndex: 1 (February) -> 29 days
// Expected keys: '2024-02-01' to '2024-02-29'

describe("isCalendarMapCompleteForMonth", () => {
    const year = 2024;
    const monthIndex = 1; // February
    // Mock LIVE_DIVISION_TAGS or use known tags from divisions.ts
    // For test, let's use a subset that we know exist in DIVISIONS
    const divisionTags = ["ipbl-66-m-pro-a", "ipbl-66-m-pro-b"];

    function getExpectedDays(): string[] {
        const days = [];
        for (let i = 1; i <= 29; i++) {
            days.push(`2024-02-${String(i).padStart(2, "0")}`);
        }
        return days;
    }

    function createValidMap(): CalendarGridMap {
        const map: CalendarGridMap = {};
        const days = getExpectedDays();
        for (const day of days) {
            map[day] = [
                {
                    date: day,
                    division: "Pro Men A",
                    divisionTag: "ipbl-66-m-pro-a",
                    games: []
                },
                {
                    date: day,
                    division: "Pro Men B",
                    divisionTag: "ipbl-66-m-pro-b",
                    games: []
                }
            ];
        }
        return map;
    }

    it("should return false if map is null", () => {
        expect(isCalendarMapCompleteForMonth(null, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return false if map is undefined", () => {
        expect(isCalendarMapCompleteForMonth(undefined, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return true for a valid and complete calendar map", () => {
        const map = createValidMap();
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(true);
    });

    it("should return false if map is missing days", () => {
        const map = createValidMap();
        delete map["2024-02-15"];
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return false if map has extra days", () => {
        const map = createValidMap();
        map["2024-03-01"] = [];
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return false if map has incorrect keys but same length", () => {
        const map = createValidMap();
        delete map["2024-02-15"];
        map["2024-02-30"] = []; // Invalid day, replaces 15th
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return false if divisionTags yield no valid division configs", () => {
        const map = createValidMap();
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, ["invalid-tag"])).toBe(false);
    });

    it("should return false if a day is missing a division (row length mismatch)", () => {
        const map = createValidMap();
        map["2024-02-10"].pop(); // Remove one division for this day
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return false if a day has an incorrect division tag", () => {
        const map = createValidMap();
        map["2024-02-10"][0].divisionTag = "incorrect-tag";
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(false);
    });

    it("should return false if a day has an incorrect date in the array", () => {
        const map = createValidMap();
        map["2024-02-10"][0].date = "2024-02-11";
        expect(isCalendarMapCompleteForMonth(map, year, monthIndex, divisionTags)).toBe(false);
    });
});
