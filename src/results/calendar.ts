import type { ScheduleGame } from "../api/types";
import { DIVISIONS, divisionsForResultsMonth, type DivisionConfig } from "../config/divisions";
import { RESULTS_SYNC_TAGS } from "../../lib/results-constants";
import { toMyanmarDateTime } from "../time/myanmar";

export type ResultsMonthMetadata = {
    schemaVersion: 1;
    status: "ok" | "source_unavailable" | "legacy";
    source: string;
    checkedAt: string;
    updatedAt: string | null;
    verifiedThroughDate: string | null;
    year: number;
    month: number;
    divisionTag: string;
    fetchedRows?: number;
    acceptedRows?: number;
    mergedRows?: number;
    preservedRows?: number;
    rejectedNonFinished?: number;
    duplicatesCollapsed?: number;
    partialPeriodRows?: number;
    quarantinedPeriodRows?: number;
    error?: string;
};

export type CalendarGridGame = {
    game: ScheduleGame;
    time: string;
    teams: string;
    score: string;
    division: string;
    divisionTag: string;
    quarterTotals: string | null;
    evidence?: {
        periodCount: number;
        periodState: "complete" | "partial" | "missing" | "conflict";
        scoreIntegrity: "consistent" | "partial" | "unknown" | "conflict";
        quarterEvidenceQuarantined: boolean;
    };
};
export type CalendarGridDivision = { date: string; division: string; divisionTag: string; games: CalendarGridGame[] };
export type CalendarGridMap = Record<string, CalendarGridDivision[]>;
export type ResultsCalendarMap = CalendarGridMap;
export type ResultsGame = ScheduleGame;
export type ResultsMonthPayload = { calendar: CalendarGridMap; meta: ResultsMonthMetadata };

export const RESULTS_DIVISION_TAGS = RESULTS_SYNC_TAGS;
export const RESULTS_DIVISIONS: DivisionConfig[] = DIVISIONS.filter((d) => (RESULTS_SYNC_TAGS as readonly string[]).includes(d.tag));
export function resultsDivisionsForMonth(year: number, monthIndex: number): DivisionConfig[] {
    return divisionsForResultsMonth(year, monthIndex).filter((d) => (RESULTS_SYNC_TAGS as readonly string[]).includes(d.tag));
}

const RESULTS_CACHE_WINDOW_MS = 15 * 60_000;
export const RESULTS_SESSION_CACHE_TTL_MS = RESULTS_CACHE_WINDOW_MS;
export const RESULTS_REFRESH_INTERVAL_MS = RESULTS_CACHE_WINDOW_MS;
const sessionCache = new Map<string, { at: number; payload: ResultsMonthPayload }>();
const inflight = new Map<string, Promise<ResultsMonthPayload>>();
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
function monthDayKeys(year: number, monthIndex: number): string[] {
    return Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, i) => iso(year, monthIndex, i + 1));
}
function sessionKey(y:number,m:number,t:string){return `${y}-${m+1}|${t}|Asia/Yangon`;}
function configFor(tag:string){return DIVISIONS.find((d)=>d.tag===tag);}
function createEmptyMonthMap(year:number,monthIndex:number,divisions:DivisionConfig[]):CalendarGridMap{
    return Object.fromEntries(monthDayKeys(year,monthIndex).map((key)=>[key,divisions.map((d)=>({date:key,division:d.label,divisionTag:d.tag,games:[]}))]));
}
export function createSkeletonResultsCalendarMap(year:number,monthIndex:number,divisionTags:string[]):CalendarGridMap{
    const set=new Set(divisionTags); return createEmptyMonthMap(year,monthIndex,resultsDivisionsForMonth(year,monthIndex).filter((d)=>set.has(d.tag)));
}
export function isCalendarMapCompleteForMonth(map:CalendarGridMap,year:number,monthIndex:number,divisionTags:string[]):boolean{
    const keys=monthDayKeys(year,monthIndex); if(Object.keys(map).length!==keys.length)return false;
    return keys.every((key)=>Array.isArray(map[key])&&divisionTags.every((tag)=>map[key].some((d)=>d.divisionTag===tag)));
}
export function clearResultsCalendarCache(){sessionCache.clear();inflight.clear();}

export function resultsApiErrorMessage(error: unknown, fallback: string): string {
    const code = String(error ?? fallback);
    if (code === "results_storage_quota_exceeded") {
        return "Results storage is temporarily unavailable. Retry after the storage quota resets.";
    }
    return code;
}

function latestPopulatedDate(map: CalendarGridMap): string | null {
    const days = Object.entries(map)
        .filter(([, groups]) => groups.some((group) => group.games.length > 0))
        .map(([day]) => day)
        .sort();
    return days.at(-1) ?? null;
}

function legacyMetadata(map: CalendarGridMap, year: number, monthIndex: number, divisionTag: string): ResultsMonthMetadata {
    return {
        schemaVersion: 1,
        status: "legacy",
        source: "results-kv",
        checkedAt: new Date(0).toISOString(),
        updatedAt: null,
        verifiedThroughDate: latestPopulatedDate(map),
        year,
        month: monthIndex + 1,
        divisionTag,
    };
}

async function fetchRaw(
    year:number,
    monthIndex:number,
    divisionTag:string,
    optional=false
):Promise<{ calendar: CalendarGridMap; meta: ResultsMonthMetadata | null }> {
    const url=`/api/results?year=${year}&month=${monthIndex+1}&division=${encodeURIComponent(divisionTag)}&meta=1`;
    const res=await fetch(url,{headers:{Accept:"application/json"}});
    const text=await res.text();
    if(!res.ok){
        if(optional&&res.status===404)return{calendar:{},meta:null};
        let msg=`HTTP ${res.status}`;
        try{msg=resultsApiErrorMessage((JSON.parse(text) as {error?:unknown}).error,msg);}catch{}
        throw new Error(msg);
    }
    const body=JSON.parse(text) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) {
        const envelope = body as { calendar?: unknown; meta?: unknown };
        if (envelope.calendar && typeof envelope.calendar === "object" && !Array.isArray(envelope.calendar)) {
            const calendar = envelope.calendar as CalendarGridMap;
            const meta = envelope.meta && typeof envelope.meta === "object"
                ? envelope.meta as ResultsMonthMetadata
                : legacyMetadata(calendar, year, monthIndex, divisionTag);
            return { calendar, meta };
        }
        const calendar = body as CalendarGridMap;
        return { calendar, meta: legacyMetadata(calendar, year, monthIndex, divisionTag) };
    }
    throw new Error("Invalid Results response");
}
function previousMonth(year:number,monthIndex:number){return monthIndex===0?{year:year-1,monthIndex:11}:{year,monthIndex:monthIndex-1};}
export function shouldFetchPreviousResultsMonth(year:number,monthIndex:number,divisionTag:string):boolean{
    const prev=previousMonth(year,monthIndex);
    return resultsDivisionsForMonth(prev.year,prev.monthIndex).some((division)=>division.tag===divisionTag);
}
function regroupMyanmar(maps:CalendarGridMap[],year:number,monthIndex:number,tag:string):CalendarGridMap{
    const cfg=configFor(tag); if(!cfg)return{}; const out=createEmptyMonthMap(year,monthIndex,[cfg]); const seen=new Set<number>();
    for(const map of maps) for(const groups of Object.values(map||{})) for(const group of groups||[]) for(const row of group.games||[]){
        const game=row.game; if(!game||seen.has(game.gameId))continue;
        const display=toMyanmarDateTime({scheduledTime:game.scheduledTime,localDate:game.sourceLocalDate??game.localDate,localTime:game.sourceLocalTime??game.localTime});
        if(!display.isoDate.startsWith(`${year}-${String(monthIndex+1).padStart(2,"0")}-`)||!out[display.isoDate])continue;
        seen.add(game.gameId);
        const converted:ScheduleGame={...game,sourceLocalDate:game.sourceLocalDate??game.localDate,sourceLocalTime:game.sourceLocalTime??game.localTime,sourceTimeZone:game.sourceTimeZone??"UTC+05:00",displayTimeZone:"Asia/Yangon",localDate:display.displayDate,localTime:display.time};
        out[display.isoDate][0].games.push({...row,game:converted,time:display.time});
    }
    for(const groups of Object.values(out))groups[0].games.sort((a,b)=>a.time.localeCompare(b.time));
    return out;
}

export async function fetchResultsMonthPayloadFromApi({
    year,
    monthIndex,
    divisionTag,
    force=false,
}:{year:number;monthIndex:number;divisionTag:string;force?:boolean}):Promise<ResultsMonthPayload>{
    const key=sessionKey(year,monthIndex,divisionTag),now=Date.now(),hit=sessionCache.get(key);
    if(!force&&hit&&now-hit.at<RESULTS_SESSION_CACHE_TTL_MS)return structuredClone(hit.payload);
    const pending=inflight.get(key);if(pending)return pending;
    const promise=(async()=>{
        const prev=previousMonth(year,monthIndex);
        const previousPromise=shouldFetchPreviousResultsMonth(year,monthIndex,divisionTag)
            ? fetchRaw(prev.year,prev.monthIndex,divisionTag,true)
            : Promise.resolve({calendar:{},meta:null});
        const [previous,current]=await Promise.all([
            previousPromise,
            fetchRaw(year,monthIndex,divisionTag),
        ]);
        const payload={calendar:regroupMyanmar([previous.calendar,current.calendar],year,monthIndex,divisionTag),meta:current.meta??legacyMetadata(current.calendar,year,monthIndex,divisionTag)};
        sessionCache.set(key,{at:Date.now(),payload});
        return structuredClone(payload);
    })();
    inflight.set(key,promise);try{return await promise;}finally{inflight.delete(key);}
}

export async function fetchResultsMonthFromApi(args:{year:number;monthIndex:number;divisionTag:string;force?:boolean}):Promise<CalendarGridMap>{
    return (await fetchResultsMonthPayloadFromApi(args)).calendar;
}
