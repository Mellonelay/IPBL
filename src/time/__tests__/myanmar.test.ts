import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toMyanmarDateTime } from "../myanmar";

describe("toMyanmarDateTime", () => {
    it("should process a valid scheduledTime correctly", () => {
        // Scheduled time given in UTC
        const input = { scheduledTime: "2023-10-27T10:00:00Z" };
        const result = toMyanmarDateTime(input);

        // 10:00 UTC + 06:30 (Myanmar) = 16:30 Myanmar time
        assert.equal(result.isoDate, "2023-10-27");
        assert.equal(result.displayDate, "27.10.2023");
        assert.equal(result.time, "16:30");
        assert.equal(result.instant, "2023-10-27T10:00:00.000Z");
    });

    it("should process valid localDate and localTime into correct Myanmar time", () => {
        // sourceIso creates string: "2023-10-27T10:00:00+05:00"
        // +05:00 to Myanmar (+06:30) is +01:30
        // So 10:00 should become 11:30
        const input = { localDate: "27.10.2023", localTime: "10:00" };
        const result = toMyanmarDateTime(input);

        assert.equal(result.isoDate, "2023-10-27");
        assert.equal(result.displayDate, "27.10.2023");
        assert.equal(result.time, "11:30");
        assert.equal(typeof result.instant, "string");
    });

    it("should process ISO format localDate", () => {
        const input = { localDate: "2023-12-05", localTime: "14:30" };
        const result = toMyanmarDateTime(input);

        // 14:30 + 01:30 = 16:00
        assert.equal(result.isoDate, "2023-12-05");
        assert.equal(result.displayDate, "05.12.2023");
        assert.equal(result.time, "16:00");
    });

    it("should handle missing or invalid input gracefully", () => {
        const input = { localDate: "invalid", localTime: "invalid" };
        const result = toMyanmarDateTime(input);
        assert.equal(result.isoDate, "invalid");
        assert.equal(result.displayDate, "invalid");
        assert.equal(result.time, "invalid");
        assert.equal(result.instant, null);
    });

    it("should handle entirely empty input gracefully", () => {
        const input = {};
        const result = toMyanmarDateTime(input);
        assert.equal(result.isoDate, "");
        assert.equal(result.displayDate, "");
        assert.equal(result.time, "TBD");
        assert.equal(result.instant, null);
    });

    it("should prefer scheduledTime over localDate/localTime", () => {
        const input = {
            scheduledTime: "2023-10-27T10:00:00Z",
            localDate: "28.10.2023",
            localTime: "12:00"
        };
        const result = toMyanmarDateTime(input);

        // Should ignore the localDate/localTime and use scheduledTime
        assert.equal(result.isoDate, "2023-10-27");
        assert.equal(result.time, "16:30"); // 10:00 UTC = 16:30 MMT
    });
});
