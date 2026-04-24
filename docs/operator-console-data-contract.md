# IPBL Operator Console — Data Contracts (Internal)

This document is the **source of truth** for how the Operator Console maps upstream IPBL data into UI state.
If behavior drifts, we fix code to match this contract (not the other way around).

## 1) Approved divisions (canonical scope)

The console supports **exactly** these divisions:

- Pro Men A
- Pro Men B
- Pro Men C
- Pro Men D
- Pro Men G
- Pro Men J
- Pro Women A
- Pro Women B
- Pro Women C

Any row outside this list must not render as a Live card or supported Results row.

## 2) Canonical division tag map (labels)

Never trust upstream free-text division labels for UI rendering.
Always derive the UI division label from our own mapping by `tag`.

Canonical mapping:

| tag | canonicalLabel |
| --- | --- |
| `ipbl-66-m-pro-a` | Pro Men A |
| `ipbl-66-m-pro-b` | Pro Men B |
| `ipbl-66-m-pro-c` | Pro Men C |
| `ipbl-66-m-pro-d` | Pro Men D |
| `ipbl-66-m-pro-g` | Pro Men G |
| `ipbl-66-m-pro-j` | Pro Men J |
| `ipbl-66-w-pro-a` | Pro Women A |
| `ipbl-66-w-pro-b` | Pro Women B |
| `ipbl-66-w-pro-c` | Pro Women C |

## 3) Live contract

A Live card may render **only if**:

- **Source**: it comes from current upstream online/live data (`/api/ipbl/calendar/online`)
- **Truth gate**: it passes the strict live truth gate (no stale historical “online” rows)
- **Division**: it belongs to an approved division tag
- **Identity**: it is keyed by **`${tag}:${gameId}`**
- **No production fallback**: stale/demo/fallback rows may not appear in production mode

Live refresh behavior:

- Every refresh must **REPLACE** Live state completely.
- No merging of “survivor” cards unless the same `${tag}:${gameId}` exists in the newest upstream payload.
- Persistent caching of Live cards as truth is forbidden.

## 4) Results contract

A Results row may render **only if**:

- It belongs to the currently selected **year+month** (month browser)
- It belongs to the selected division tag, unless selection is **All divisions**
- Its day is normalized internally to canonical `YYYY-MM-DD`
- It renders under the correct **day card** and correct **division group** inside that day

## 5) UI contract

- No checkbox filters anywhere (dropdown-only filters)
- No generic placeholder text like literal **“Division”** where a real division label is known
- Remove operator-unwanted controls (e.g. **Print** and **Share** controls in Results)
- No prominent raw Net P/L headline card

## 6) Acceptance checks (dev-only)

In development builds only, the app must assert:

1. **Division mapping**: every rendered Live/Results row uses a canonical known label
2. **Results filter**: when selected division is `ipbl-66-m-pro-a`, all rendered rows are Pro Men A
3. **Live filter**: when selected division is `ipbl-66-w-pro-b`, all rendered live rows are Pro Women B
4. **Live truth**: no row with stale historical `localDate` may be rendered live
5. **No placeholder leakage**: Results rows must not render the literal placeholder label “Division”
