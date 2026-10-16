# Balanced treatment overview and visible appointment header

Owner instruction: 16 October 2026. Balance the women's/physician opening columns, restore the centred-navigation/right-appointment sticky header, review, update documentation thoroughly and publish. The standing no-tests/no-release-gates instruction remains. Normal compilation and direct source/browser/visual review are included.

Baseline: `b0f98ae61ed001ee37cf623c6f07ac2ecddbb81d`. Work branch: `codex/balanced-treatments-and-header-20261016`; return branch: `checkpoint/before-balanced-treatments-and-header-20261016`. A separate `candidate/` worktree preserves the maintained source and all earlier copies. No old version is deleted, reset or force-pushed.

## Design intent

The opening treatment overview should give both doctors equal presence and useful quick choices. The header should always have a clearly visible appointment action, with navigation toward the centre and the brand on the left. Keep existing typography, colours, filled icons, artwork and choreography. Do not increase apparent richness by claiming unconfirmed clinic procedures.

## Implementation spec

- Keep the eight actual topic definitions, payloads, selection state, doctor mapping and artwork unchanged. The opening overview has five links per group. The women's side adds two focused entry points: period concerns/PCOS → existing women's-health detail; care after childbirth → existing pregnancy detail. Both already appear in the actual catalogue and doctor summary. Keep all original eight opening topics and their links. No extra booking service, new procedure, invented outcome or new topic animation is introduced.
- Overview grid stretches both columns at widths ≥768px. Group wrappers are flex columns; their five-row lists fill the available height. Retain 24px corners, 1px borders, blue/mint backgrounds, 17px bold titles, 15px supporting text and existing icon sizes/hover/focus. Phone cards stack and size naturally, without empty padding to imitate a desktop column. Five links on each side make the content balanced as well as the outer height.
- Desktop header ≥1200px: three columns, equal flexible side tracks, auto-width navigation, 24px gaps; retain 1280px maximum width, 88px minimum row height, 16px navigation, bold 16px appointment action and existing logo/button/active-marker styling. Keep the existing sticky owner. Below1200px use brand / appointment / menu, with existing 80px phone height, readable wrapped brand and short visible Book label plus full accessible name. Inspect 1440,1200,1024,768,390 and320 widths; no collision or horizontal overflow.
- The actual reason the action is missing is the shared OFF binding, not absent markup. Keep all shared booking state/readiness/routing/submission rules unchanged. Only the header CTA has a usable supported contact destination while OFF. One existing `syncBookingVisibility()` owner updates its destination before the general booking-link pass, removes stale booking-only attributes and restores visibility. An enabled display uses `/booking`; OFF/unavailable/unknown uses the real `/contact` phone choices. A foreground check retaining an already-enabled view keeps its booking target under the existing display contract; shared admission remains blocked until fresh. No second controller, fetch, timer, simulated state, provider activation or hosting exception.
- The owner was asked an optional destination preference. After a reasonable opportunity to reply, use the stated recommendation as an implementation assumption: restore the action and open Contact until online booking is ready. Do not record silence as approval or as an answer. If a later answer differs, incorporate it before publication.

## Upstream/downstream review

The shared header affects all eight main page views and menu layouts. Preserve active navigation, focus rings, mobile menu binding, signed OFF routes, all non-header booking-only links and form guards. Header destination updates must cooperate with the existing shared child-list observer; never clear a guard globally. Topic overview additions must be derived from existing catalogue records rather than making a second booking source of truth. The selected-detail scene keeps its original loading/cancellation/error/URL behavior.

No backend, database, shared package, other client, global asset, fee, schedule, payment, cancellation, review, credential or provider change belongs in this refinement. Research can establish general wording, not prove this clinic offers a procedure. Source evidence already contains period/PCOS and after-childbirth care; NHS [period information](https://www.nhs.uk/conditions/periods/period-problems/) and [care after birth](https://www.nhs.uk/baby/support-and-services/your-6-week-postnatal-check/) provide terminology context only. No UK-specific timetable or treatment advice enters the clinic page.

## Completion sequence

1. Save the baseline and capture actual missing-button/column-height evidence.
2. Implement only the two requested refinements on the separate branch.
3. Review source ownership and actual desktop/tablet/phone, hover/focus/menu, selected treatment and natural/settled movement states; correct in-scope issues and revisit.
4. Update the app README and client status/README/brief/build notes, distinguishing current publication from earlier preserved evidence and unfinished provider/content inputs.
5. Commit and publish through existing main → Vercel; inspect actual official headers, column heights and CTA destination before regrouping. Preserve both remote branches and exact receipt. No tests or release gates.
