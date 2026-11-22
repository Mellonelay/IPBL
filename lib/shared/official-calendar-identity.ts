/**
 * The tag in the request URL is a filter, not proof of source competition.
 * All official calendar consumers validate the returned league identity
 * before normalizing a game under that tag.
 */
export function verifiedOfficialCalendarRows(raw: unknown, requestedTag: string): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("invalid_calendar_response");
  }
  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("invalid_calendar_response");
  }
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items) ||
      items.some(item => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("invalid_calendar_response");
  }
  for (const row of items as Record<string, unknown>[]) {
    const league = row.league;
    if (!league || typeof league !== "object" || Array.isArray(league)) {
      throw new Error("division_identity_unresolved");
    }
    const tag = (league as { tag?: unknown }).tag;
    if (typeof tag !== "string" || !tag.trim()) {
      throw new Error("division_identity_unresolved");
    }
    if (tag !== requestedTag) {
      throw new Error("division_mismatch");
    }
  }
  return items as Record<string, unknown>[];
}
