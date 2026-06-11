import type { ScheduleGame } from "../api/types";
import { DIVISIONS, divisionsForResultsMonth, type DivisionConfig } from "../config/divisions";
import { RESULTS_SYNC_TAGS } from "../../lib/results-constants";
import { toMyanmarDateTime } from "../time/myanmar";

export type CalendarGridGame = {
    game: ScheduleGame; time: string; teams: string; score: string;
    division: string; divisionTag: string; quarterTotals: string | null;
};
export type CalendarGridDivision = { date: string; division: string; divisionTag: string; games: CalendarGridGame[] };
export type CalendarGridMap = Record<string, CalendarGridDivision[]>;
export type ResultsCalendarMap = CalendarGridMap;
export type ResultsGame = ScheduleGame;
export const RESULTS_DIVISION_TAGS = RESULTS_SYNC_TAGS;
export const RESULTS_DIVISIONS: DivisionConfig[] = DIVISIONS.filter((d) => (RESULTS_SYNC_TAGS as readonly string[]).includes(d.tag));
export function resultsDivisionsForMonth(year: number, monthIndex: number): DivisionConfig[] {
    return divisionsForResultsMonth(year, monthIndex).filter((d) => (RESULTS_SYNC_TAGS as readonly string[]).includes(d.tag));
}

const SESSION_CACHE_TTL_MS = 60_000;
const sessionCache = new Map<string, { at: number; map: CalendarGridMap }>();
const inflight = new Map<string, Promise<CalendarGridMap>>();
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

async function fetchRaw(year:number,monthIndex:number,divisionTag:string,optional=false):Promise<CalendarGridMap>{
    const url=`/api/results?year=${year}&month=${monthIndex+1}&division=${encodeURIComponent(divisionTag)}`;
    const res=await fetch(url,{headers:{Accept:"application/json"}}); const text=await res.text();
    if(!res.ok){if(optional&&res.status===404)return{};let msg=`HTTP ${res.status}`;try{msg=String((JSON.parse(text) as {error?:unknown}).error??msg);}catch{}throw new Error(msg);}
    const body=JSON.parse(text) as CalendarGridMap|{calendar:CalendarGridMap};
    return "calendar" in body ? body.calendar : body;
}
function previousMonth(year:number,monthIndex:number){return monthIndex===0?{year:year-1,monthIndex:11}:{year,monthIndex:monthIndex-1};}
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
export async function fetchResultsMonthFromApi({year,monthIndex,divisionTag}:{year:number;monthIndex:number;divisionTag:string}):Promise<CalendarGridMap>{
    const key=sessionKey(year,monthIndex,divisionTag),now=Date.now(),hit=sessionCache.get(key); if(hit&&now-hit.at<SESSION_CACHE_TTL_MS)return structuredClone(hit.map);
    const pending=inflight.get(key);if(pending)return pending;
    const promise=(async()=>{const prev=previousMonth(year,monthIndex);const [previous,current]=await Promise.all([fetchRaw(prev.year,prev.monthIndex,divisionTag,true),fetchRaw(year,monthIndex,divisionTag)]);const map=regroupMyanmar([previous,current],year,monthIndex,divisionTag);sessionCache.set(key,{at:Date.now(),map});return structuredClone(map);})();
    inflight.set(key,promise);try{return await promise;}finally{inflight.delete(key);}
}
