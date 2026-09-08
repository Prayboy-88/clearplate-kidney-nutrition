# ClearPlate audit fixes implementation plan

Goal: Fix the six reproducible browser-audit failures without new dependencies or changing recipe planning features.
Architecture: Keep local browser storage and current React components. Serialize saves with Web Locks and reject stale snapshots. Preserve unknown optional nutrients through calculations. Reuse a dialog focus hook.
Tech stack: React 19, Vite 8, Node built-in tests, existing Playwright CLI.
Spec: User-approved six findings in this task, 2026-09-07.

## Constraints
- Work in the existing checkout; preserve current user work. User subsequently authorized committing, pushing to main and verifying the production release after final checks.
- Existing npm dependencies only. No new medical target recommendations.
- Keep drafts after rejected/failed writes. Never silently overwrite newer records.
- Calories, protein, sodium must be explicitly entered for outside food; potassium/phosphorus may remain unknown (null), including totals/display.
- Do not infer whether legacy numeric zeros were missing input.

## Tasks and acceptance checks
- [x] 1. Storage: src/App.jsx, src/utils/storage.js, src/utils/storage.test.js. Add a save transaction taking expected serialized state and next state, serialized by one origin-wide Web Lock. Compare raw storage within lock before writing; on conflict reject, retain drafts, update baseline/state for retry with an explicit message. Rebase only unrelated data when retrying (Profile must not reset its draft on background refresh). Never auto-retry the rejected action. Test stale and simultaneous writers, failed storage write, and normal saves. Await save results throughout App and modal callbacks; block duplicate pending submissions.
- [x] 2. Nutrition entry/display: src/components/CustomFoodModal.jsx, src/utils/nutrition.js, tests, src/components/NutrientProgress.jsx. Start fields blank; reject missing required values; retain explicit zero; optional blank values become null and stay unknown in nutrition/totals/formatting. Preserve danger status even with estimates; show estimate label independently. Reset portions and form defaults only after successful addition; failed saves retain input. Browser-check required input, zero, optional unknown, portions and overage.
- [x] 3. Profile/dialogs: ProfileDrawer.jsx, shared dialog hook, CustomFoodModal.jsx, AddMealModal.jsx. Only non-dialysis G1/G2/G3a/G3b/G4 permits auto range. Leaving eligibility disables auto and requires explicit manual targets when previous auto targets were active. Existing manual targets remain editable. Cover stored invalid G5 auto profile. Trap Tab/Shift+Tab, Escape closes, focus restores to opener. Verify all three dialogs in desktop/mobile browser.
- [x] 4. Integration: retain browser regression script under scripts/ with callable existing CLI, fresh isolated browser. Run red assertions before fixes; green after. Run npm test, npm run build, git diff --check. Review final diff and browser evidence before reporting.

## Execution notes
The concrete root causes and red browser outputs are in output/playwright/human-food-result.txt and human-profile-result.txt. Subagent handles tasks 2-3; parent handles task 1 and integrated regression testing. Shared interface: all onAdd/onSave callbacks may return Promise<boolean>; false means leave dialog and draft intact. Task 1 alone edits App.jsx/storage utilities. No separate worktree because user requested existing project and forbids unsolicited branches/worktrees.

## Verification and added mobile scope
- All six audit findings fixed; storage and final integration reviews passed.
- User requested mobile History layout during implementation. At <=720px calendar cells show only dates/status, while nutrition is presented below in readable separated rows. Balanced 20px margins and stable scrollbar space replace nested bordered panels. Desktop month overview retained.
- npm test: 31/31. npm run build: success. git diff --check: no errors.
- scripts/browser-audit-regression.js: 13/13, including legacy G5 in Today/AddMeal/History/Plan and concurrent save/retry.
- scripts/browser-history-layout.js: 6/6, including 320/390/430px layout and month/date selection. Mobile recipe logging succeeded.
- Release gate: rerun all checks, commit and push to main, verify Vercel commit identity and run the browser checks on the production URL. Browser scripts use UI-created profiles so they also run against production builds.
- Legacy zeros cannot be distinguished from explicitly entered zeros; they are preserved.
