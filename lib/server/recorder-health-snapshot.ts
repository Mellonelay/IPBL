import { evaluateRecorderHealth, SOURCE_HEALTH_POLICY, type RecorderHealth } from "./source-health.js";
import { recorderKeys, type RecorderRedis } from "./live-recorder.js";

export type RecorderHealthSnapshot = {
  status: unknown;
  activeGameKeys: string[];
  runRows: unknown[];
  health: RecorderHealth;
};

export async function buildRecorderHealthSnapshot(
  redis: RecorderRedis,
  nowMs = Date.now(),
): Promise<RecorderHealthSnapshot> {
  const [status, activeGameKeys, runRows] = await Promise.all([
    redis.get(recorderKeys.status),
    redis.smembers(recorderKeys.active),
    redis.lrange(recorderKeys.runs, 0, SOURCE_HEALTH_POLICY.recentRunWindow - 1),
  ]);

  const health = evaluateRecorderHealth(status, runRows, nowMs, activeGameKeys);
  return {
    status: status ?? null,
    activeGameKeys,
    runRows,
    health,
  };
}
