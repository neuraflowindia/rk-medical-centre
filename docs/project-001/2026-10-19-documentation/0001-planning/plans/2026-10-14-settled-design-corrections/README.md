> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Dated plan, not the current task list.** Reviewed 19 October 2026. [Current project status](../../../PROJECT-STATUS.md) points to the implemented/published 18 October refinement and the separate unfinished guided launch. Keep this plan and its comparison evidence; do not replay its completed work or interpret an old local-only status as today's publication state.

# Project 001 — correction plan

14 October 2026. **Approved and implemented in a separate local correction candidate.** The specifications below record the agreed programme; the private studies remain its planning evidence. See the implemented candidate (local workspace reference: `03-client-projects/001-doctors/0006-qa/2026-10-14-correction-candidate/README.md`) and completion evidence (local workspace reference: `03-client-projects/001-doctors/0006-qa/2026-10-14-correction-candidate/evidence/local-completion-review.md`) for current results. Earlier versions, the active shared master and other clients remain unchanged. Local checks are not owner visual acceptance or a live release.

Start with the interactive preview (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/preview.html`). It has eight correction studies, current/proposed comparison, four screen widths, assembly playback and a progress slider. It is served locally at:

`http://127.0.0.1:4202/0001-planning/plans/2026-10-14-settled-design-corrections/preview.html`

The existing Original/Current/Next/candidate comparison remains at `http://127.0.0.1:4198/__review/compare/`. Neither preview is a published customer website. If the local server is not running, serve the **client folder**, not this plan subfolder, at port 4202; the preview reads the preserved candidate's artwork and styling. No new account or customer system is involved.

## What the diagnosis established

| Area | Confirmed cause | Planned correction |
|---|---|---|
| Loose dots and lines | Some animation helpers leave their last point/rule visible, without a named destination | Give each traveling piece a real destination or an explicit disappearance at the end |
| Double edges | A moving backing adds its own border outside an already bordered card/form | One surface owns the final border and shadow; backing finishes inside that surface |
| Flat hero cards | The current shadow is about 5% navy and the outline is very light | Stronger, bounded shadow and 1.5px edge; retain the four cards and whole stethoscope |
| Hollow/floating icons | Icons are thin outlines and sometimes positioned outside the component | Filled, recognizable icons inside reserved reading slots |
| Doctor information | Credentials and reviews remain, but several biography details were shortened and no genuine photo area exists | Stacked full-width doctor features with photo space, education, experience, care bullets, fee and useful links |
| Cancellation policy | Old restrictions exist in the database and staff screen as well as public wording | One per-clinic staff-discretion setting, applied consistently across the shared booking extension |
| Booking button while OFF | Replacing a treatment's content inserts a fresh button without reapplying availability | Apply the same central readiness rule before new content appears |
| Real bookings | Local test identity exists; production accounts, routing and provider acceptance are not configured | Prepare the supported local connection; finish owned-account setup when the clinic supplies its account/domain choices |

Evidence: Home/Treatments audit (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/home-treatment-motion-audit.md`), other pages and original content (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/page-audit/content-and-settled-design-audit.md`), booking diagnosis (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/booking-diagnosis.md`).

## Design decisions

Keep Lora/Lato, navy/teal/cream/blue/mint, the established section order, 32 purpose-made compositions, whole instruments, existing meaningful assembly and ongoing loops. No new generated image is needed to fix a line, border, icon or layout fault. The separate studies reuse the existing images; no new room or doctor photograph is invented.

The final state of a scene must work as a still design. Then the movement explains how that arrangement forms: a backing opens, an instrument arrives and changes position, a useful icon settles into its slot, a connecting trace completes its job. Fixing the end does not justify replacing the sequence with a fade.

The strongest correction is to stop using a line as a universal embellishment. A line remains when it belongs to the illustration, separates real sections or connects named items. A card needs depth from one good edge and shadow, not another enclosing card.

The two doctor features become vertically stacked on the Doctors page. Within each desktop feature, the genuine-photo space sits beside the information. On phones it sits above. Until approved photos are supplied, a name/initials treatment is the proposed fallback. Generic medical figures remain supporting artwork and are never presented as photographs of either doctor.

## Concrete visual values

These are the consolidated correction values. They govern the eight planning studies. The section ledger (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/section-specifications.md`) governs full-site motion and specific endings; the content specification (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/content-specifications.md`) governs facts and wording. When a study is a limited demonstration rather than the complete product sequence, that is stated below.

| Item | Specification |
|---|---|
| Colors | Navy `#1b365d`; text `#16324d`; teal `#0a706b`; hover `#085c58`; cream `#fffbf4`; blue `#eaf3fc`; mint `#e7f4ef`; body `#455865` |
| Reading width | Existing max 1280px. At 1440: 80px outer gutters; 900: 32px; 390: 20px; 320: 16px |
| Vertical spacing | Normal section 80px desktop / 52px phone; current Home hero 36px top / 64px bottom desktop |
| Type | Home title 52px desktop / 36px phone / 34px at 320; normal section title 38px / 32px; doctor names 30px / 28px tablet / 27px phone; doctor prose 18px / 17px; button 16px/700; body line-height 1.6–1.65 |
| Hero geometry | Preserve 760px desktop stage, whole 450px instrument, 166px minimum cards, 24px corners. Phone: 300px art bay, whole 280px instrument, two-column cards at least 170px high with 12px gap; existing 290/270 targets at 320 |
| Hero card edge | `1.5px solid #9db8bd`; white front; shadow `0 16px 30px -8px #1b365d2e, 0 3px 7px #1b365d14` |
| Hero hover/focus | Surface lifts 4px over 180ms; shadow `0 22px 38px -9px #1b365d3d, 0 4px 8px #1b365d1f`; text and target stay fixed; 3px teal focus outline with 5px offset |
| Hero support sentence | 16px/700, no underline and no left rule. Preserve the useful sentence |
| Icon hierarchy | Filled family; hero 36px/32px, facts 24px/22px, controls 18px. Negative-space detail is allowed; no fine hollow symbol floating outside a card |
| Form surface | One border, `1.5px #adc5ca`, 26px corners, shadow `0 16px 36px -12px #1b365d24`; 32px padding desktop / 24px 20px phone; labels 16px, inputs at least 48px |
| Treatment choice | One surface, 22px corners, 24px padding, internal icon/title/doctor/arrow; no 01/02 sequence labels and no outside family-tree lines |
| Doctor feature | One card, 28px corners desktop / 24px phone; `1.5px #b3c7ca`; shadow `0 18px 36px -20px #1b365d33`; padding 32px desktop / 28px tablet / 22px 20px phone / 20px 16px at 320 |
| Doctor photo space | 4:5; 300×375 desktop, 240×300 tablet, max 280×350 phone; 20px corners. No forced crop of an unsupplied face. Art accent 140×116 desktop / 120×100 phone |
| Doctor spacing | 36px internal desktop gap / 28px tablet / 26px phone; 40px between doctor features / 28px phone. No fixed overall height |
| Footer and closing | One full-width `1px #aec2bd` top border. No second inner rule or blur. CTA label grid `1fr 20px`, 20px horizontal padding for both actions, same label origin |
| Ordinary interaction | 180–220ms response; minimum 44px targets. Fixed readable text, active selection distinguished by weight and color, keyboard focus visible |

Use dimensions as constraints, not screenshot-only coordinates. Review the in-between widths, long text and 200% text enlargement. Do not hide overflow at page level to conceal a geometry error.

## Motion retention and correction

- Home hero keeps its backing formation, instrument arrival/overshoot/settling, main green curve, sequential card hinges, icon arrivals and 12-second loop. Remove the four unrelated branch paths and both support-text rules. Do not alter the main instrument path to compensate.
- Forms and treatment choices keep their opening surfaces. Only one final edge remains. Reading text and input controls do not rotate, drift or wait to become usable.
- Treatment artworks keep their different part movements and current total durations. Temporary arcs and travelers withdraw or arrive at actual list icons. A stationary icon does not need another floating duplicate.
- The calendar/folio/pen, profile paper mechanics, leaf opening, contact handset/pin and booking-holder sequences remain. The ledger specifies which temporary outlines tuck away or disappear; removing the entire scene is not an acceptable shortcut.
- Keep existing section-specific loops, with resting portions, offscreen/hidden-tab handling and operating-system reduced-motion support. Do not add public pause controls. Do not add loops to form reading merely to increase a motion count.
- New paths use the same geometry for their traveling marker and stroke. A path endpoint is measured against the actual target, and remeasured after relevant layout changes. No independent guessed dot coordinates.

### What the private preview does and does not prove

The eight studies show the revised final layout and selected assembly. Hero and treatment part movements reuse actual candidate functions. Private replay/scrubbing is outside customer content. The other studies demonstrate the intended surface/icon handoff, not every retained full-page track. In particular, the full implementation must preserve the existing distinct treatment loops and page lifecycle; the studies' simplified supporting icon loops are not a replacement specification. The current screenshot and proposal can have different heights when new doctor content is added.

The preview shows booking controls in the intended available state to allow layout review. It cannot create a booking. The receiving application remains OFF until its real connection is ready. Existing OFF-state screenshots are identified separately in the audits.

## Booking decision now settled

Public wording: **“For cancellations or changes, contact the clinic.”** Use the correct phone for the booked doctor, or both named numbers when no doctor is selected. Do not publish the staff's decision process or the old 12-hour/24-hour/14-day timetable.

Staff may cancel or move a confirmed appointment, **including one whose start has passed**, with a recorded reason. Preserve old/new dates, who changed it, original booking and payment history. A replacement must be a future available time for the same doctor; no overlapping appointments. A cancellation is not a refund. Existing authorized payment-account users handle a refund through the official provider dashboard; actual refund evidence remains accurately recorded.

The isolated common-package extension will gain an optional per-clinic `staff_discretion` setting and a new migration. Existing 003/004 policies remain unchanged. Database enforcement, returned permission flags, staff screen, customer wording, receipts and notifications must agree. See the full booking contract and failure cases (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/booking-diagnosis.md`).

Both payment choices remain the agreed aim. Add per-choice readiness so unavailable online payment does not masquerade as usable, while clinic payment does not depend on Razorpay. Never silently switch a patient's chosen payment method or create a second appointment after an uncertain payment.

## Implementation sequence after this plan is agreed

The following 20 steps form one coherent local correction programme. Internal checks are fix-and-continue steps, not additional owner approval gates. External account setup is separately bounded below because the required identities are not yet chosen.

| Step | Work | Completion evidence |
|---:|---|---|
| 1 | Make a separate correction copy of the current receiving app and isolated booking package; preserve all earlier versions | File inventory and hashes; no source overwritten |
| 2 | Capture the current eight routes, ON/OFF states, late loop states and original content | Named evidence linked to the feedback register |
| 3 | Consolidate confirmed doctor facts and exact review collection references | 26/26 review pairs; no invented qualification or photo |
| 4 | Establish one border owner and explicit path/marker endings in the existing motion helpers | Small helper changes with callers traced; no global hiding trick |
| 5 | Correct hero card depth, solid icons, supporting sentence and unnecessary branches | Desktop/phone entrance, hover, focus, rest and loop comparisons |
| 6 | Correct form surface and three-step reading area | Stable input controls, one surface, optional email, draft continuity |
| 7 | Correct treatment cards and group headings | Six images retained, no shelf stubs, correct reading order |
| 8 | Correct the two treatment choices and topic detail endings | Five physician and three women's topics; no mixed specialty list |
| 9 | Check every topic's interrupted transition and ongoing cycle | Latest selection wins; no overlapping icon interiors or detached markers |
| 10 | Correct About preparation, clinic facts and doctor summaries | One useful divider, proper internal icons, confirmed content |
| 11 | Build stacked doctor features and fuller profile information | Photo-safe layout, simple copy, fee/contact facts, no omitted approved reviews |
| 12 | Correct the two profiles, Contact artwork and final action areas | Retained paper/folio/contact motion; aligned labels and one footer boundary |
| 13 | Repair booking visibility after dynamic treatment changes | OFF stays OFF after all eight selections and route changes |
| 14 | Add clinic-specific staff discretion in the isolated shared package | New migration; same rule in staff flags and actual writes; legacy unaffected |
| 15 | Support past-appointment changes with history and safe retries | Old/new facts retained; competing/duplicate/stale operations behave correctly |
| 16 | Add accurate payment-choice readiness and contact-only wording | Direct request and UI agree; old payment recovery still works |
| 17 | Install the complete updated package into the correction app | Official installer, manifest identity, migrations 001–038 unchanged |
| 18 | Prepare Vercel routing, signed ON/OFF surfaces and account setup files | Local build and configuration validation; unresolved owned-account values explicit |
| 19 | Review every changed scene and booking state; correct findings and repeat focused checks | Start/middle/end/loop, four core widths plus boundary sizes, keyboard and failures |
| 20 | Update current-state docs and present the separate candidate for review | What is built, what was proved, what remains external; no premature live claim |

## Source ownership and change boundaries

- Layout/content: existing `home.js`, `page-parts.js`, `retained-pages.js`, `treatments.js`, `ui.js` and their owning styles. Consolidate facts in the existing shared client fact record; do not maintain copied biography variants with competing facts.
- Motion: existing `choreography-primitives.mjs`, `choreography-physical.mjs`, `choreography-sections.mjs`, `choreography-topics.mjs`, `choreography-profile-contact.mjs`, `motion.js`. Add explicit path lifetime/endpoint handling where needed; do not globally turn every path off.
- In the new copy, edit the original owning style rule and remove only superseded duplicate correction rules. Do not stack more contradictory CSS at the bottom. Preserve untouched historical copies.
- Booking: isolated `booking-master-candidate`, its settings validation, migration 039, staff browser, policy response and contract readers. Install the whole package into the new receiving app. Do not hand-patch only the installed package.
- The active shared master, other clients, existing hosted accounts and databases are untouched by this local programme. A neutral optional extension is prepared for future promotion; no automatic rollout to other businesses.
- Preserve current voluntary form flow, memory-only draft, optional measurement default, existing identity/access boundaries, independent doctor capacity, accepted fee/payment facts, hidden internal 20-minute length and Maps pin.

## External setup boundary

Vercel is chosen. **`www.rkmedicalcentre.com` is only a possible, unbought name**, not a configured or verified domain. The Vercel account/team is still unknown. Do not put that possible host in production configuration, email links, allowed origins or sign-in redirects yet. Do not borrow another client's connected account.

Local work can finish the correction copy, shared package, migration, routing/build integration, source allowlist, configuration templates without secrets, focused checks and onboarding checklist. This does not require buying a domain now.

Real launch still needs the correct account/team and approved public origin, clinic-owned database, verified sender, worker/recovery connection, payment merchant, protected staff sign-in/record consent and named real-provider acceptance. Prepare those actions and exact required inputs before asking the owner to do anything. No live bookings, messages, payments, database changes, commits, pushes or deployment are included in this planning pass. Full local/hosted suites remain a later explicitly approved check.

## Verification and recovery

Visual acceptance must inspect native start, intermediate frames, natural finish, at least two relevant loop cycles, hover/focus/selected, expanded content and ON/OFF. Use 1920,1440,1024,900,768,390,320 where relevant, including just above/below responsive breakpoints. The current private proof covers four core widths and selected motion; it is not the full future acceptance matrix.

Functional focused checks must cover staff role denial, past/future changes, same-doctor capacity, two doctors at the same time, 13:20/13:30 and 20:20/20:30 overlap, Sunday evening closure, retained accepted facts, duplicate/stale actions, notifications built from the saved revision, payment readiness/recovery, optional email, draft continuity, customer read-only details and absence of duration. Keep at least 90% coverage on changed working code without exclusions used to inflate results; report the actual measured scope. Do not describe a screenshot count as coverage.

Rollback is preservation plus compatible repair, not bringing an old booking writer back online. Keep admission OFF if a compatible writer is unavailable. New audit history and payment observations must not be erased to roll back a visual change. Full recovery instructions, including backup and migration checks before any later live action, are in the booking report.

## Review inputs that may arrive later

Approved doctor photographs can replace the prepared initials area without a layout overhaul. The original high-risk pregnancy, 3D/4D ultrasound, metabolic-care and additional facility claims are explicitly inventoried; they are not silently dropped or invented. A separate question asks whether the named source services can be carried over as confirmed. Until answered, the layout uses already-confirmed facts and reserves room for the fuller list.

Review records and narrow proof limits are in review-results.md (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/review-results.md`). Third-party guidance choices and rejected conflicts are in skills-and-research.md (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-settled-design-corrections/skills-and-research.md`).
