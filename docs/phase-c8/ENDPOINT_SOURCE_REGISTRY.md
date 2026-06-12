# Phase C8 Endpoint Source Registry

The registry contains all 64 refined first-party candidates from the rotating mirror capture. It distinguishes the capture host (`melbet-319960.top`) from the production fallback host (`melbet.com`).

Production currently uses the `Get1x2_VZip` family. `GetSportsShortZip`, `GetGameZip`, and `GetSubsOptionsForGame` have verified fixtures and parsers but are not yet the production recorder source. `GetHistoryGraphExt` remains blocked because the current tested path returned HTTP 404. H2H, MelZone, standings, team profiles, player profiles, and lineups were not observed and remain unproven.
