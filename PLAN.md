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
- [x] Phase 2: Design system — shared card/chip/button styles, status glyphs (color-independent per §63), empty states on every list. Full visual identity pass still open.
- [x] Phase 3: Onboarding + Future Me draft flow (vision questions → editable draft stored, Serious/Adventure choice, route gate). Editing Future Me post-onboarding still open.
- [x] Phase 4: Goal detail screen — SMART draft (offline heuristic coach + optional remote LLM via env key) editable, milestones CRUD, per-goal action list, history log. Full VISION→GOAL hierarchy + dependency graph still open.
- [x] Phase 5: Calendar intelligence v1 — typed availability patterns ("mon-fri 18:00-21:00"), deterministic slot finder avoiding event conflicts, one-tap focus scheduling. External calendar integrations still open.
- [x] Phase 6: Goal Health + Confidence wired to real history with explained reasons; recovery actions Pause/Resume/+7 days/Mark done/Abandon. Minimum Viable Day suggestions still open.
- [x] Phase 7: AI layer — provider abstraction (heuristic default; Anthropic adapter activates when EXPO_PUBLIC_ANTHROPIC_API_KEY set, model via EXPO_PUBLIC_AI_MODEL [assumed default]), Ask-Becoming chat screen grounded in real app data with §57 guardrails. Deterministic schedule-validation gate still open.
- [x] Phase 8: Game depth v1 — companion selection (9 original species), progressive states Healthy→Tired→Weak→Dormant derived from real activity gaps, revive ≤2 then rest, 4 achievements auto-awarded on completion events. Procedural variation, habitats, shop still open.
- [x] Phase 9 (foundations): Supabase client module activates when env keys exist; email auth inline in Profile; supabase/schema.sql ships groups+profiles+RLS foundations ready to paste. Live sync engine + full group flows need a created project first.
- [x] Phase 10 (digest): Insights screen = weekly review digest (completions, misses, Frogs, streak, mode) + adaptive advice rules + Minimum Viable Day suggestion evenings. Apply/ignore action buttons still open.
- [x] Phase 11 (local): Daily Frog reminder scheduling via expo-notifications (v57 docs-verified), permission flow, time setting persisted. Quiet-hours enforcement + adaptive reminder timing still open.
- [x] Phase 12 (scaffolding): eas.json build profiles (preview simulator/APK + production), dark splash identity. Full accessibility audit, App Store assets, screenshots still open.

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
