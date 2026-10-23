/** Prevent responses for previously selected games from replacing the newest H2H view. */
export function createHistoryRequestGuard() {
  let latest = 0;
  return {
    next(): number { return ++latest; },
    isCurrent(requestId: number): boolean { return requestId === latest; },
  };
}
