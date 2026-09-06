import { describe, it, expect } from "vitest";
import { toMyanmarDateTime } from "../myanmar";

describe("toMyanmarDateTime", () => {
    it("should process a valid scheduledTime correctly", () => {
        // Scheduled time given in UTC
        const input = { scheduledTime: "2023-10-27T10:00:00Z" };
        const result = toMyanmarDateTime(input);

        // 10:00 UTC + 06:30 (Myanmar) = 16:30 Myanmar time
        expect(result.isoDate).toBe("2023-10-27");
        expect(result.displayDate).toBe("27.10.2023");
        expect(result.time).toBe("16:30");
        expect(result.instant).toBe("2023-10-27T10:00:00.000Z");
    });

    it("should process valid localDate and localTime into correct Myanmar time", () => {
        // sourceIso creates string: "2023-10-27T10:00:00+05:00"
        // +05:00 to Myanmar (+06:30) is +01:30
        // So 10:00 should become 11:30
        const input = { localDate: "27.10.2023", localTime: "10:00" };
        const result = toMyanmarDateTime(input);

        expect(result.isoDate).toBe("2023-10-27");
        expect(result.displayDate).toBe("27.10.2023");
        expect(result.time).toBe("11:30");
        expect(typeof result.instant).toBe("string");
    });

    it("should process ISO format localDate", () => {
        const input = { localDate: "2023-12-05", localTime: "14:30" };
        const result = toMyanmarDateTime(input);

        // 14:30 + 01:30 = 16:00
        expect(result.isoDate).toBe("2023-12-05");
        expect(result.displayDate).toBe("05.12.2023");
        expect(result.time).toBe("16:00");
    });

    it("should handle missing or invalid input gracefully", () => {
        const input = { localDate: "invalid", localTime: "invalid" };
        const result = toMyanmarDateTime(input);
        expect(result.isoDate).toBe("invalid");
        expect(result.displayDate).toBe("invalid");
        expect(result.time).toBe("invalid");
        expect(result.instant).toBeNull();
    });

    it("should handle entirely empty input gracefully", () => {
        const input = {};
        const result = toMyanmarDateTime(input);
        expect(result.isoDate).toBe("");
        expect(result.displayDate).toBe("");
        expect(result.time).toBe("TBD");
        expect(result.instant).toBeNull();
    });

    it("should prefer scheduledTime over localDate/localTime", () => {
        const input = {
            scheduledTime: "2023-10-27T10:00:00Z",
            localDate: "28.10.2023",
            localTime: "12:00"
        };
        const result = toMyanmarDateTime(input);

        // Should ignore the localDate/localTime and use scheduledTime
        expect(result.isoDate).toBe("2023-10-27");
        expect(result.time).toBe("16:30"); // 10:00 UTC = 16:30 MMT
    });
});
