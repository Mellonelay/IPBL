export const MYANMAR_TIME_ZONE = "Asia/Yangon";
export const IPBL_SOURCE_OFFSET = "+05:00";

type MyanmarParts = { isoDate: string; displayDate: string; time: string; instant: string | null };

function sourceIso(localDate?: string | null, localTime?: string | null): string | null {
    const date = String(localDate ?? "").trim();
    const time = String(localTime ?? "").trim();
    if (!date || !time) return null;
    let isoDate = date;
    const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) isoDate = `${match[3]}-${match[2]}-${match[1]}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
    return `${isoDate}T${time.padStart(5, "0")}:00${IPBL_SOURCE_OFFSET}`;
}

export function toMyanmarDateTime(input: {
    scheduledTime?: string | null;
    localDate?: string | null;
    localTime?: string | null;
}): MyanmarParts {
    const candidate = String(input.scheduledTime ?? "").trim() || sourceIso(input.localDate, input.localTime);
    const parsed = candidate ? new Date(candidate) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
        return {
            isoDate: String(input.localDate ?? ""),
            displayDate: String(input.localDate ?? ""),
            time: String(input.localTime ?? "") || "TBD",
            instant: null,
        };
    }
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MYANMAR_TIME_ZONE,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(parsed);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year"); const month = get("month"); const day = get("day");
    const hour = get("hour"); const minute = get("minute");
    return {
        isoDate: `${year}-${month}-${day}`,
        displayDate: `${day}.${month}.${year}`,
        time: `${hour}:${minute}`,
        instant: parsed.toISOString(),
    };
}
