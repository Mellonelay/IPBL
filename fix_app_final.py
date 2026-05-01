import sys
import re

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update loadLive to be more efficient (async insights)
# We look for the start of the function and its end
start_marker = "  const loadLive = useCallback(async () => {"
end_marker = "  }, []);"

# Finding the specific index for this function
start_idx = content.find(start_marker)
if start_idx != -1:
    # We find the matching end_marker after the start
    # Note: there might be multiple loadResults, so we need the one after loadLive
    # Actually, let's just replace the whole range if we can find it precisely
    
    # We'll use a more precise search for the old block
    old_block_part = "    setLiveLoading(true);\n    // Hard reset: do not show any cards until the current upstream refresh completes.\n    setLiveGames([]);\n    setLiveInsights({});"
    if old_block_part in content:
        # We perform the specific functional replacement
        new_load_live_body = """    setLiveLoading(true);
    setLiveErr(null);
    try {
      const res = await fetch("/api/results/live");
      if (!res.ok) throw new Error(`Live API error: ${res.status}`);
      const games = (await res.json()) as ScheduleGame[];
      setLiveGames(games);

      const insights = await Promise.all(
        games.map(async (game): Promise<[string, LiveInsight]> => {
          try {
            const [gameMeta, boxState] = await Promise.all([
              fetchGame(game.gameId, game.tag),
              fetchBoxScore(game.gameId, game.tag),
            ]);
            const boxRaw = boxState.fetchedOk ? boxState.raw : null;
            const board = getScoreboardAnalysis(game, boxRaw, gameMeta.raw);
            const flow = analyzeQuarterFlow(game, boxRaw, gameMeta.raw);
            const decision = evaluateOperatorDecision({
              quarter: currentOrNextQuarter(flow, board),
              division: gameDivision(game),
              hour: new Date().getHours(),
              team1: game.team1.shortName,
              team2: game.team2.shortName,
              flow,
            });

            return [
              liveKey(game),
              {
                game,
                board,
                flow,
                decision,
                gameMeta: gameMeta.raw,
                boxState,
              },
            ];
          } catch (e) {
            const board = getScoreboardAnalysis(game, null, null);
            return [
              liveKey(game),
              {
                game,
                board,
                flow: { signal: "NO_SIGNAL", q1Points: null, q2Points: null, paceTrend: "UNKNOWN" },
                decision: { decision: "CAUTION", reasons: ["Insight fetch failed"], suggestedBias: null },
                gameMeta: null,
                boxState: null,
              }
            ];
          }
        })
      );

      const nextInsights = Object.fromEntries(insights);
      setLiveInsights(nextInsights);
    } catch (error) {
      setLiveErr(error instanceof Error ? error.message : "Live load failed");
    } finally {
      setLiveLoading(false);
    }"""
        # Replace from setLiveLoading to the end of the block
        # This is slightly risky but let's use a regex to match the body of the function
        content = re.sub(r'setLiveLoading\(true\);.*?setLiveLoading\(false\);', new_load_live_body, content, flags=re.DOTALL)

# 2. Fix the component mapping in the render
content = content.replace('{menLive.map((insight) => (', '{menLive.map((game) => (')
content = content.replace('{womenLive.map((insight) => (', '{womenLive.map((game) => (')
# Correcting the props for LiveCard inside the maps
# We look for insight={insight} inside the maps and replace it
content = content.replace('insight={insight}', 'game={game} insight={liveInsights[liveKey(game)]}')

# 3. Final cleaning of any mangled characters that might have slipped through
content = content.replace('ÃƒÆ’Ã†â€™Ãƒâ€\xa0Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â\xa0ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€\xa0Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€\xa0Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦', '...')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final functional and encoding cleanup finished.")
