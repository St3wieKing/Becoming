# Plan: Becoming — AI goal OS (React Native + Expo)

One-line goal: A production-quality iPhone-first goal operating system where vague ambitions become SMART goals, scheduled actions, honest daily progress — optionally gamified — per the 100-section product spec.

## Classification
Track: From scratch — greenfield app built from the spec document only. Parked secondary asks: Apple Watch, Android builds, leaderboards, advanced habitats, live payments (all v2+, named in spec §89–93).

## Interview Ledger
Q1 platform/toolchain fork → React Native + Expo (accepted). Exit signal received → remaining forks defaulted-and-tagged. Total questions: 2/14.

## Key Decisions
- Expo SDK 57 + React Native 0.86 + TypeScript (verified: package.json after scaffold)
- expo-router file-based navigation, bottom tabs Home/Goals/Calendar/[Companion]/Profile; Companion tab hidden in Serious Mode (spec §94)
- Local-first storage: expo-sqlite with PRAGMA user_version migrations (verified: v57 docs); sync-ready schema so a backend can attach later without rewrites (spec §70)
- Serious/Game mode via global settings store (zustand) — default serious
- Coin ledger is append-only `coin_tx` table, never a bare balance field (spec §69)
- Frog selection deterministic scoring: priority weight + difficulty bonus + goal-link bonus (spec §16 impact over convenience)
- Rewards: base by difficulty ×2 frog bonus +10 evidence, single-reward cap 300 (spec §38–40 anti-farm posture)
- Goal Health/Confidence: deterministic rules engine returning status + confidence + human-readable reasons, no fake precision (spec §11–12)

## Scope (v1 skeleton shipped now)
Onboarding-lite deferred; currently: create goals (priority/difficulty/deadline), first action auto-scheduled today, Daily Frog pick + honest complete/didn't-complete, internal calendar events, coins ledger in Game Mode, mode toggle, AI-control-mode setting.

## Assumptions Ledger
| ID | Assumption | Basis | If wrong |
|----|-----------|-------|----------|
| A1 | EAS cloud builds produce installable iOS binaries without a Mac | Expo service docs; verify Phase P1 on-device test | Need Mac/CI rental |
| A2 | Supabase chosen later for auth/sync/groups | SQL fits relational model + RLS privacy (spec §47/76) | Firebase swap isolated behind repo layer |
| A3 | LLM behind provider-abstraction interface; key via env var only | spec §78 | Swap provider cheaply |
| A4 | English-only UI v1; single timezone/device-local dates | scope control | i18n phase added |

## Build Phases
- [x] Phase 1: Toolchain + walking skeleton (Node/Git portable installs, Expo scaffold, sqlite layer, engines, tab shell, honest completion loop)
      Done when: `npm run typecheck` passes AND screens render in Expo Go / web export
- [ ] Phase 2: Design system pass — Becoming visual identity, dark-premium tokens, empty/loading/error states everywhere (spec §64/73/74)
- [ ] Phase 3: Onboarding + Future Me draft flow with editable vision (spec §5/25)
- [ ] Phase 4: SMART goal engine conversational draft (deterministic templates first), goal hierarchy VISION→GOAL→MILESTONE→PROJECT→ACTION, dependencies (spec §6–10)
- [ ] Phase 5: Calendar intelligence — availability windows, recurring patterns typed in natural language, slot finder, Apple Calendar opt-in read-only (spec §13–15)
- [ ] Phase 6: Goal Health + Confidence engine wired to real history data + recovery flows CatchUp/Extend/Reduce/Rebuild/Pause/Abandon + Minimum Viable Day suggestions (spec §11–12/17/27)
- [ ] Phase 7: AI layer — provider abstraction, prompt templates, output validation gate, chat screen, Manual/Assisted/Autopilot gating, memory store with view/edit/delete (spec §4/23/56–57/78–79)
- [ ] Phase 8: Game depth — creature selection, procedural variation, progressive states Healthy→Dormant→Disappeared with 2 revives, achievements subset, shop stub (spec §31–35/42)
- [ ] Phase 9: Backend — Supabase auth, sync, groups ≤15 with granular visibility, server-authoritative coin validation (spec §43–45/68/76)
- [ ] Phase 10: Weekly review digest + recommendations apply/ignore (spec §26)
- [ ] Phase 11: Notifications — quiet hours, adaptive timing suggestions (spec §21–22/67)
- [ ] Phase 12: Polish + accessibility audit (Dynamic Type, VoiceOver, reduced motion, haptics) + EAS build profile + TestFlight submission prep (spec §63/65–66/71)

## Verification
- `npm run typecheck` — must pass every commit
- `npx expo export --platform web` — bundle proof on Windows
- Device: install Expo Go → scan QR from `npx expo start` → walk: create goal → see Frog on Home → Eat the Frog → coin ledger row appears (Game Mode on) / plain confirmation (Serious Mode)
- Human confirms done by completing that device walk personally

## What the human must do manually
1. Test on iPhone: App Store → "Expo Go" → scan the QR printed by `npx expo start` (free, no Apple account needed)
2. When Phase 9 lands: create free Supabase project; paste URL + anon key into `.env` (never commit `.env`)
3. When Phase 7 lands: create an LLM provider API key; store as env var, reference `${ENV_VAR}` — never paste values
4. Before App Store: paid Apple Developer Program enrollment + EAS account (`eas login`) for cloud iOS builds [A1]
