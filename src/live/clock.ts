export type LiveClockProjection = {
  remainingSeconds: number | null;
  elapsedSeconds: number | null;
  remainingText: string;
  elapsedText: string;
  running: boolean;
};

export function parseClockSeconds(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,3})\s*[:.]\s*(\d{1,2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null;
  return minutes * 60 + seconds;
}

export function formatClockSeconds(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const safe = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function periodDurationSeconds(period: number | null | undefined): number | null {
  if (!period || period < 1) return null;
  return period <= 4 ? 600 : 300;
}

export function elapsedGameSeconds(period: number | null | undefined, remainingSeconds: number | null): number | null {
  const duration = periodDurationSeconds(period);
  if (duration === null || remainingSeconds === null || !period) return null;
  const remaining = Math.min(duration, Math.max(0, remainingSeconds));
  if (period <= 4) return (period - 1) * 600 + (duration - remaining);
  return 4 * 600 + (period - 5) * 300 + (duration - remaining);
}

export function projectLiveClock(input: {
  period: number | null | undefined;
  timeToGo: string | null | undefined;
  timeIsGo: number | null | undefined;
  elapsedMs: number;
}): LiveClockProjection {
  const sourceRemaining = parseClockSeconds(input.timeToGo);
  const running = input.timeIsGo === 1;
  const decrement = running ? Math.max(0, Math.floor(input.elapsedMs / 1000)) : 0;
  const duration = periodDurationSeconds(input.period);
  const remainingSeconds = sourceRemaining === null
    ? null
    : Math.max(0, Math.min(duration ?? sourceRemaining, sourceRemaining - decrement));
  const elapsedSeconds = elapsedGameSeconds(input.period, remainingSeconds);
  return {
    remainingSeconds,
    elapsedSeconds,
    remainingText: formatClockSeconds(remainingSeconds),
    elapsedText: formatClockSeconds(elapsedSeconds),
    running,
  };
}
