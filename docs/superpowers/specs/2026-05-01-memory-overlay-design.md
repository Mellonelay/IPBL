# Design Spec: Memory Overlay & Sync Hardening (M1+M2)

**Date:** 2026-05-01  
**Status:** DRAFT  
**Milestones:** M1 (Sync Hardening) + M2 (Memory Overlay)

## 1. Overview
This design implements "The Insight Halo," a visual augmentation layer for the IPBL Operator Console. It bridges the behavioral truth (betting history) with the presentation layer (Live Cards & Results Grid) to provide instant risk awareness. Simultaneously, it hardens the data pipeline by introducing a global "Sync Health" indicator to ensure decisions are never made on stale data.

## 2. Core Concepts

### 2.1 The Insight Halo (Risk Visuals)
*   **Purpose:** Highlight dangerous matchups without requiring the operator to open the match drawer.
*   **Trigger Logic:**
    *   **High Risk (Red Halo):** Matchup has $\ge 2$ consecutive losses OR overall win rate is $< 30\%$ (minimum 3 bets).
    *   **Visual:** A subtle, pulsing red outer glow (`shadow-[red-500/20]`) on the match card or calendar cell.
*   **Badges:** Tiny corner indicators:
    *   `W` (Green): Last outcome was a win.
    *   `L` (Red): Last outcome was a loss.
    *   `?` (Grey): Sync failed or no data available.

### 2.2 Global Sync Health (M1 Hardening)
*   **Visual:** A 2px high status bar at the absolute top of the viewport.
*   **States:**
    *   **Cyan:** Fresh sync (Last 60s).
    *   **Amber:** Stale (No sync for 5+ mins).
    *   **Red:** Fail (Last API call returned 401, 500, or malformed data).
*   **Protection:** If health is **Red**, all UI indicators desaturate (`grayscale`) to signal that risk data is currently untrusted.

## 3. Implementation Plan

### 3.1 Data Layer Extensions
*   **Hook Update:** `useBettingMemory` will be extended to return `lastSyncTime` and `syncStatus`.
*   **Local Storage:** Cache the last successful `betting_memory_index.json` to allow comparison and drift detection.

### 3.2 UI Component Updates
*   **`App.tsx`:** Add the `SyncStatusBar` component.
*   **`LiveCard.tsx`:** Implement conditional CSS classes for the "Halo" glow.
*   **`ResultsCalendarGrid.tsx`:** Add the `StreakBadge` and "Halo" logic to individual match items.

## 4. User Experience (UX)
1.  Operator opens the "Live" tab.
2.  If the top bar is **Cyan**, the operator knows the betting memory is accurate.
3.  A card with a **Red Halo** pulses, drawing immediate attention to a historically "losing" matchup.
4.  Operator hovers over the `L` badge to see "Streak: 3L | WR: 12%".
5.  Operator uses this "Insight" to decide whether to BLOCK or CAUTION the upcoming quarter.

## 5. Security & Failure Handling
*   **Auth Failure:** If the backend returns `401 Unauthorized` during sync, the top bar turns **Red** immediately.
*   **Graceful Degeneracy:** If the memory file is missing, the UI defaults to "Neutral" (no halos) to avoid false-positive risk signals.

## 6. Success Criteria
*   [ ] Operator can identify a "3-loss streak" matchup in under 2 seconds.
*   [ ] Console visually signals within 10 seconds if the Vercel cron sync has failed.
*   [ ] No "Permission Denied" errors during the build process.
