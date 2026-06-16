export type LiveDisplayInsight<TGame> = { game: TGame };

export function buildLiveDisplayInsights<
  TGame extends { tag: string },
  TInsight extends LiveDisplayInsight<TGame>,
>({
  games,
  insights,
  selectedDivisionTag,
  keyForGame,
}: {
  games: TGame[];
  insights: Record<string, TInsight>;
  selectedDivisionTag: string;
  keyForGame: (game: TGame) => string;
}): TInsight[] {
  return games
    .filter((game) => selectedDivisionTag === "" || game.tag === selectedDivisionTag)
    .map((game) => {
      const insight = insights[keyForGame(game)];
      return insight ? { ...insight, game } : null;
    })
    .filter((insight): insight is TInsight => insight !== null);
}
