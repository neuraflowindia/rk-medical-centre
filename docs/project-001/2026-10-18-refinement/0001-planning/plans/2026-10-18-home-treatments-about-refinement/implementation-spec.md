# Implementation specification — approved programme

18 October 2026 update: the owner approved the complete strengthened plan, separate branch, review, documentation and official publication. Implementation and local review are complete; the [current delivery](../../../0006-qa/2026-10-18-home-treatments-about-implementation/README.md) owns the publication checkpoint. The original inspection/proposal details below record the basis and contracts of this approved implementation. No further approval is needed; the no-tests boundary remains.


## 1. Objective, authority and baseline

Make the requested areas more useful, readable and complete without redesigning the whole website. The owner has approved the complete programme, including the separate branch, review, documentation and official publication. Preserve the maintained application, the original Doctor-Demo reference, all earlier comparisons and all other client projects.

The [strengthened implementation contracts](implementation-contracts.md) are part of this same plan. They define state/ownership, slow-media behavior, resize preservation, shared heading rows, neutral portraits and future review obligations. Read them with the visual values below; there is no separate workstream or extra approval gate.

Maintained app/Git root:`0005-website/00001-production-source-code/`. Current clean local and remote main:`200fdcf50e235d3981268dadc7e5dd356bbeab3f`. Published runtime:a77f772. Fresh public asset identities and exact screenshots are in `0006-qa/2026-10-18-refinement-inspection/`. The old ignored local dist contains index-BinQspwV and must not be used as the current baseline or republished accidentally.

After approval, make a separate implementation branch/worktree, suggested `work/home-treatments-about-refinement-20261018`, with a named baseline return point. Record actual hashes then; do not assume main has stayed unchanged. No delete/reset/force-push. A later approved publication uses this clinic's existing GitHub-main→Vercel→rkmedicalcentre.com route. It changes no other account or provider.

## 2. Existing owners and proposed smallest source changes

| Source owner | Current behavior | Intended bounded change |
| --- | --- | --- |
| `home.js` | Home hero, four specialties, page section order. | Patient-focused hero copy;2+2 labels/links; four purposeful actions; attached facts. Keep every other section call. |
| `model.mjs` / `care-catalogue.mjs` | Doctor facts, fees, phone/address/hours, eight topics/two doctor mappings. | Read these as truth. If a short locality is needed, define its explicit display value beside the existing address; never parse a brittle comma position or copy facts into several renderers. No topic/service change. |
| `site.js` | One shared booking display owner; header destination exception; generic guard pass. | Extend the existing entry helper to the explicitly marked Home primary action only. Keep header behavior, routing, all other guards, freshness/admission and form rules. No second store/fetch/timer. |
| `home-refinement.css` / `refinement-layout.css` | Final responsive Home geometry and action styling. | Put new Home values into the existing owner; remove/supersede only directly conflicting rules, with cascade review. Do not paste the private study's generic freeze selectors. |
| `treatments.js` / `care-pages.css` | Catalogue-led ten-entry overview into eight topics; equal columns; two chapter explorers. | Keep markup structure/links; distinct heading bands and local category colors; desktop height/spacing. Preparation source text remains. |
| `artwork.js` / `layer-geometry.mjs` / `composition-data.mjs` | Shared images and intact layers with their exact source coordinate boxes. | Only A32 gains an SVG-overlay renderer inside its existing layer SVG. Keep original image geometry and data-part names. Geometry data and all other compositions remain unchanged. |
| `about-page.js` / `page-parts.js` / `doctor-pages.css` | About intro, care/certifications, compact photo-less doctorCards(false,'about'), preparation. | Three opening facts/actions; About-specific photo/name wrapper, biography/care links, two stacked rows; practical details in existing last section. Other doctorCards presentations retain their output. |
| `choreography-sections.mjs` | H3-card translates/rotates/scales image; A3 symbol/fact sequence; A32 intact-piece sequence. | H3-card becomes opacity-only; A3 parent yields doctor sequences to independent A3-panel children. Original A3 child tracks/glints and A32 transforms/loop remain. |
| `scene-definitions.mjs` / `motion.js` | Shared contexts/clocks, child visibility, resize/reduced-motion cleanup. | H3-card480ms child specification/context; focus settles it without a media wait; A3 children at all widths preserve progress/unseen state on resize. Other scene resize/pause policies remain. |
| `appointment-settings/hosting-files.json`, `src/main.jsx` | Explicit production source allowlist/style entry. | Include every newly introduced runtime module/style, only if needed. Never include planning files, private photos, review scripts or source snapshots. |

Use exactly three small new runtime files: `clinic-glance.js` for the two shared fact-strip variants, `clinic-glance.css` for their scoped styling, and `preparation-art.mjs` for A32 marks. Home/About import the fact renderer; it uses the existing icon/escaping helpers and accepts canonical prepared entries, without fetching or state. artwork.js imports the pure A32-mark renderer, which does not import artwork/page renderers back. src/main.jsx imports the new CSS once after existing page styles. Include all three files in the hosting source list. Reuse existing page/style owners for page-specific work; do not split static sentences into further abstractions. No new library, bundler or animation framework.

## 3. Visual system and layout constraints

**Design intent:** retain the established medical identity and readable Lora/Lato combination. Blue identifies physician care, green identifies women's health. Extra detail must explain care, experience or the next action, rather than adding ornaments.

| Item | Implementation value |
| --- | --- |
| Preserved colors | navy#1B365D; ink#16324D; teal#0A706B; warm#FFFBF4; blue field#EAF3FC; mint#E7F4EF; body#455865; white#FFFFFF. |
| Category color | Physician#245882; women#0A706B. Apply locally to care heading symbols/arrows and new hero care accents, not all global primary buttons. |
| Contrast | White/physician7.52:1; white/women5.93:1; body/white7.40:1; navy/blue10.81:1, calculated from exact sRGB values. Recheck actual rendered hover/focus combinations; these four numbers alone are not whole-site compliance proof. |
| Typography | Lora500–600 for titles; Lato400/700 for text/actions. Home h1:52px≥1200,46px768–1199,36px360–767,34px≤359; line-height1.16. Body18px desktop/17px phone,1.6. No font migration. |
| New fact text | Hero fact headline29px desktop,25px tablet,21px phone,1.3; supporting16px/1.45–1.5. About strip20px bold and16px support. Meaningful details are not microtext. |
| Containers | Existing max1280px; existing gutters80px at1440/centred max width,32px tablet,20px phone except existing16px at320. No new outer scroll container. |
| Corners/depth | Fact band24px desktop/20px phone; doctor card26px; portrait20px desktop/15px phone. Border1–1.5px. Main card shadow0 15px 28px -20px rgba(27,54,93,.30); no nested decorative cards behind the art. |
| Action state |16px bold desktop;15–16px phone; minimum48–50px height. Fine-pointer hover−3px, existing180ms ease-out, stronger existing shadow. Focus3px category/teal outline with3–4px offset; active retains current feedback. No movement on reduced motion. |
| Viewports |1920×1080,1440×900,1200×900,1024×900,768×1024,767×900,390×844,389×800,360×800,359×800,320×740. Inspect200% text/browser zoom, reduced movement and late image/font arrival. |

The installed Design Audit and animation-review skills inform hierarchy, contrast, ownership and review. Their generic reduction preference and objection to pure fades do not override this owner's preservation rule or explicit F01 request. Do not remove other motion because a generic skill favors minimalism. No OpenAI design skill is used.

## 4. Home H1

**Design intent:** recognize why someone might need either doctor, show experience without a long sales paragraph, and offer useful actions before the visitor commits to booking.

**Copy:** h1 “Expert care for the health concerns on your mind.” Lead “Speak with our doctors about diabetes and everyday illnesses, period concerns or pregnancy.” Bold only those concern terms. Retain existing eyebrow/location, two icon-led care summaries and the existing sentence below the actions.

**Actions:** first row, primary appointment entry and See treatments; second row, Our doctors and Directions. Desktop gap14px first row and26px secondary row, secondary row margin-top14px. Phone controls remain48–50px; at390px the short OFF label fits beside See treatments, below390px the first row stacks. Secondary short labels fit together. They must remain useful with keyboard/touch.

| State | Primary label/destination | Other actions |
| --- | --- | --- |
| Enabled display | Book an appointment → `/booking`. Current readiness/latest-at-click/submission checks still govern admission. | `/treatment`, Home `#doctors`, supplied external Maps pin. |
| OFF/unknown/unavailable | Arrange a visit → `/contact`, where both genuine doctor numbers are labelled. | Same three actions, all usable. |
| Refresh retains an enabled display | Retain existing product-state behavior; do not invent a new refresh policy. | No forced reload, slot or submission bypass. |

Use the exact marker `data-home-appointment-entry` on the primary hero anchor. The existing `syncBookingVisibility()` synchronizes its label/icon/destination before the generic pass, which explicitly skips only this actual entry and the actual header appointment entry. Clear data-booking-only only on those two elements; every other booking-only link/form remains hidden/inert OFF. Put data-booking-on/off on the Home label span only, with icons/arrow outside it; otherwise the shared binding would erase them. Change attributes/text only when different. No wildcard guard exception or second store. [Contract A](implementation-contracts.md#a-one-booking-display-owner-no-extra-customer-journey) specifies ordering and exact states. Do not use `/contact#phone-and-address` from another route: current navigation drops cross-route hashes. `/contact` already shows useful call choices without a router change.

The ON label is longer: below480px give the two first-row actions their own full-width rows. The private review can show that label without enabling any product state or mounting a form. OFF uses the measured compact arrangement. Check both at320,390,768 and1440; don't infer ON fit from the OFF screenshot.

**2+2 choices:** upper left Physician care / Everyday illnesses → existing physician area; upper right Diabetes care / Blood sugar concerns → existing diabetes topic; lower left Women’s health / Period concerns & PCOS → womens-health; lower right Pregnancy care / Check-ups & after childbirth → pregnancy. General health remains in the physician grouping and its full treatment cards/catalogue; it is not deleted. Use doctor/meter/heart/family solid icons. Preserve166px desktop card geometry, existing borders/shadows, positions and flap timing; blue accents for first two, green for latter two.

**Extra height:** retain the760px desktop specialty stage and its450px instrument, blue backing, original curve/path and2800ms/2300ms sequence. Append a normal-flow four-column fact band after `.hero-grid`, margin-top56px, min-height159px, padding24px28px, with2doctors / Since1992 /₹800 / Indira Nagar and short sublabels. Current36+760+64=860px becomes1075px. Do not scale/stretch the stethoscope or enlarge its motion path. At tablet width the established stacked stage remains; the strip uses2columns. Phone strip uses2columns, readable short labels and no fixed height; it adds content rather than blank space. Its independent decorative icons need no separate looping clock. Existing H1's clock/shape ownership remains the only hero-art owner.

At390px the final private study is1594.17px versus1227.84px currently; at320 it is1701.97px versus1252.66px. Those increases are natural text/actions/facts, not a25% phone rule. Keep this visible in owner review. Do not reduce font size or crop content simply to force a percentage.

## 5. Home H3 treatment entrances

**Design intent:** reveal readable finished treatment cards calmly. No tilting, flying, bending or scaling of these six cards.

**Spec:** keep H3's heading owner and per-card child IDs. For `H3-card` only, resolve a480ms child specification/context and one `c.add(card,[{opacity:0},{opacity:1}],0,480,E)`, with E=`cubic-bezier(.23,1,.32,1)`. Do not retain the old c.travel(obj,...) transform track or add a second CSS entrance. Set c.media=[] so native lazy pictures load independently into reserved geometry: a slow picture must not hold essential text at opacity0. Each card starts when its own existing visibility sentinel is reached; no shared wait, forced stagger or section-wide replay. The strengthened private replay also has no60ms illustrative stagger.

Text/links remain in final geometry; no layout height shift. Existing image hover shadow and link feedback remain on their current elements. When a link within an entering card receives focus, finish only that H3-card immediately, even before ready, using the existing motion sync owner. Existing form focus settling alone does not cover links. Reduced motion settles through the current engine. Resize preserves the card's fraction; re-entry after completion does not repeatedly hide it. Cancel/cleanup restores its original opacity on route exit. The parent H3 and all other scene durations remain unchanged. [Contract B](implementation-contracts.md#b-motion-lifecycle-and-focus) covers metadata, asynchronous preparation and failure/cleanup.

## 6. Treatments T1 heading/height

**Design intent:** clearly show two different areas of care and their doctor, before visitors scan the individual concerns. Preserve five entries on each side and equal-height desktop columns.

**Spec≥1200px:** section padding120px top/bottom; gap28px; heading link min-height142px, padding26px28px, grid48px/minmax(0,1fr)/20px with18px gaps. Blue/green solid header surfaces; white24px/1.3 Lora600 title; white16px doctor name with10px gap. White48px icon seat/radius15, category28px symbol. Use actual h2 category headings in a `.chapter-heading` block inside each chapter link, with article labels tied to those headings; retain the doctor name as supporting text. Do not merely enlarge a strong tag and call it a heading. Single outer24px rounded edge; no second border/divider below the dark header. Rows minimum96px, bold17px concern and15px/1.5 explanation, original visible dividers between rows,24px bottom list padding. Matched row tracks maintain equal columns. Study1075.47px total at1440, against869.73px.

**Tablet:** natural rows and existing two-column behavior≥768; header min132px,22px title,20px padding. Do not add25% min-height to an already taller layout. **Phone:** stack original columns, natural rows, header min128px,40px icon,22px title; below360,20px title and36px icon. Text wraps naturally; no ellipsis, horizontal slider or fixed row height.

At≥768 use shared natural heading/body tracks via CSS subgrid, not two independently sized header rows. Heading h2 IDs are overview-title-physician and overview-title-women; article aria-labelledby uses them, while #physician/#women remain the care destinations. A1200px private render exposed a4.765625px header mismatch; shared tracks now align both146.765625px headers and all five body rows without a height-measuring script. Under @supports the existing readable outer-column layout remains the fallback for older browsers. Exact selectors are in [Contract C](implementation-contracts.md#c-layout-exact-copy-and-media-contracts).

Apply category color to header symbols, topic symbols and entry arrows within `.treatment-overview-physician` / `-women`. Keep global primary-action teal and existing selected-topic meaning. Hover/focus must remain visible on dark heading bands: inset white3px outline; body links use category3px outline plus existing underline/arrow response; physician hover titles retain the physician category color instead of inheriting global teal. No scaling or rotation is added. Existing T1 connected entrance remains; inspect its intermediate planes against the new opaque bands and keep backing behind content.

Topic IDs, URL selection, immediate pressed state, cancellation generation tokens, image decode/loading/error, matching doctor and all eight T2/T3 sequences remain unchanged. Added height changes later scroll positions naturally; query-based care entry must still land below the sticky header. No API, booking service or procedure is added.

## 7. Treatments T4 A32 notes

**Design intent:** show recognizable prepared papers, rather than blank props, without filling the surrounding scene with more objects.

**Spec:** add text/checks after the existing foreignObject inside the same `.layer-media` SVG. Keep `aria-hidden` artwork; the adjacent real text remains the accessible instructions. Source image dimensions1254². Existing viewBoxes: report `[144,22,1003,1216]`; list `[142,75,962,1120]`; note `[188,220,882,872]`. These coordinates belong to the source image, not viewport pixels.

Report content group translate(310,355),rotate(−10°), heading For my visit,50–55source units; three rows Reports/Medicines/Questions at y170/305/440,44source-unit text;38unit boxes at y130/265/400; two complete green checks; two short persistent writing rules. List group translate(520,340),rotate(9°), “My questions”65units, two short44unit notes. Reuse its original raster ruling; do not add competing extra rules. Framed note group translate(430,465),rotate(8°), complete check and Ready98units. Dark writing#244D65; green checks#0A706B. The decorative text scales with the paper; it is not a substitute for17px readable preparation text beside it.

Every mark is carried by its own report/list/note layer through current translation, rotation, scale, pointer and idle motion. No root-relative overlay, detached tick or floating bullet. Preserve T4's2400ms desktop/2000ms phone assembly and10000ms existing note-lift loop. Content may appear with its paper; no new writing animation or line-vanish sequence is necessary. All marks remain at rest. Check source-safe margins through each intermediate pose at desktop/phone. If a mark cannot stay on its surface at the crop edges, adjust that mark within the native group; do not recrop or move the paper to hide it.

## 8. About A1, A3 and A4

**A1 intent/spec:** retain title, existing care choices, artwork and movement. Expand the one experience statement into a three-item attached band:2doctors; both practising since1992;₹800 for either doctor at clinic. Add Meet the doctors→same-page `#doctors` and Directions→supplied Maps link below the care choices. No booking-only link is needed here. Normal-flow band3columns,28px gap,24px28px padding,22px radius; phone1column,20px gap. Desktop private opening759px against620px. Move no artwork into a second container. Existing A1 bounds are calculated from its composition; extra band height must not enlarge the composition, curve or3000ms/2500ms sequence.

**A3 intent:** give each doctor a complete readable introduction with a genuine future photo position, qualification, experience, concerns, fee and direct actions.

**A3 spec:** use two full-width rows,30px gap,30px padding,26px radius and1.5px border. Desktop columns300px/minmax(0,1fr),36px gap. Portrait area4:5,radius20. Use the established name/initials identity treatment until genuine photos arrive; the private review now shows this neutral default and a separate stock-photo placement option. A future genuine photo uses object-fit:cover,initial object-position50%24%, adjusted only after inspecting the supplied portrait. The two reviewed bios are35/33words, in18px/1.65; do not add filler to meet the superseded45–60word estimate. Doctor name32px/1.25, facts15px with existing44px pill height and meaningful symbols. Care links use model's existing five/four entries,3columns wide desktop,2tablet. Fee and at-clinic statement keep their actual meaning; direct About and Call actions stay within the text column; existing booking-only action remains guarded.

At768–1199 use220px portrait,28px gap,26px padding. Phone: portrait area100px/4:5 beside a normal-flow identity group; the group's label/name/role determine its height. All facts/bio/links/actions span both columns below. Do not use hardcoded name/role top offsets or absolute-position text. Name26px,body17px; below360 portrait88px/name24px and one-column care links. Keep “Dr.” with the following first name when it fits at ordinary text size; allow emergency word wrapping under enlargement so no name overflows. All heights remain natural. Current private portrait-ready section1494.75px desktop and2301.14px at390; the added height is the two stacked features, reserved portraits and retained facts, not fixed empty padding.

Keep the existing symbol inside the identity group, not hanging outside the card. Preserve original qualification facts, special gold-medal emphasis, fees/calls and meaningful motion. The neutral default and photo-placement option have identical measured section geometry. Actual client photos are a later asset replacement, not a prerequisite for this neutral presentation. Private stock examples must not be published as the doctors.

**A3 upstream motion correction:** current About child scenes exist only on phones. Once rows stack on desktop, the lower doctor's sequence must wait for that doctor to become visible. Register A3 `.doctor-card-about` children on all widths, with stable existing A3/0 and A3/1 IDs. Parent A3 owns the section heading only, mirroring the existing H4 pattern. Each child retains original A3 symbol/fact timing,2300ms/1900ms and12000ms glint. Set its stage to the identity group and c.media=[]: readable text/symbol tracks do not depend on a future raster portrait. Preserve A3-panel normalized progress, unseen state and loop phase through existing snapshot/build handling before the non-Home finish-on-resize branch. Queue font-driven A3 remeasurement through that same owner; do not add another observer/loop system. Do not animate both doctors from the section's top sentinel. Normal Back/Forward settled restoration stays unchanged.

**A4 intent/spec:** keep all three preparation items, existing final action and24-hour observation wording. Group four practical facts within this existing section: exact address with Maps link; actual weekday/Sunday starting-time windows;₹800 at-clinic fee with Contact link; existing observation-care note. Two columns24px gap/padding22–24px/radius22; phone1column with18px gaps. Headings22px,body17px/1.6. No new clinic-history year, parking promise or certificate date. A4's existing preparation icon sequence and the rest of the page remain. No new looping accents required.

## 9. State and failure contracts

- Use canonical static facts and existing public page data. No new API, database table/migration, permission, authentication, storage, consent cookie, event collection, provider or payment logic. Existing booking OFF remains authoritative. Status/recovery/customer cancellation rules are untouched.
- Action labels and targets remain synchronized on initial render, route entry, refreshed state, OFF→ON, ON→OFF and late foreground refresh. An OFF→ON transition must not append duplicate nodes or restart unrelated art. A route exit disposes normal listeners/observers.
- Direct OFF `/booking` currently returns Page not found under the hosting guard. Do not use an unavailable direct page as preview proof of the actual active form; do not “fix” it by bypassing signed routing. This proposal improves visible supported entry actions only.
- No change to Contact submission or optional visitor measurement: their external destinations remain pending. The plan adds no fake successful submission.
- Reserve portrait/media dimensions. The neutral name/initials area is the implementation default while real photos are absent; a later failed genuine photo reveals the same identity area. Do not depend on remote stock photos in a public page. Static facts and call/Maps links remain useful during image failure.
- Retain reduced movement, hidden-tab/offscreen pause, resize state, hash anchor offsets, native text zoom, active nav and visible keyboard focus. Never hide essential copy permanently while waiting for an animation/media promise.
- New fact surfaces are static reading content; informational fees must not look like interactive buttons. Decorative artwork is aria-hidden; facts/headings/actions use semantic HTML. Topic/doctor colors supplement visible names; color alone does not identify the column.

## 10. Twenty-step execution and review checklist after approval

1. Re-read approval, the neutral/photo treatment and testing/publication boundaries, including the strengthened contracts.
2. Verify actual maintained root, local/remote head and dirty files; preserve unrelated work.
3. Save a branch/worktree and baseline return point; record source/asset fingerprints.
4. Capture baseline desktop/phone and natural initial/intermediate/settled states from the approved current version.
5. Map confirmed facts to existing owners; use the reviewed neutral portrait treatment until actual photos are supplied.
6. Implement the small shared factual renderer with canonical values and semantic labels.
7. Update Home headline/lead/actions without altering section order or current art geometry.
8. Apply exact2+2 specialty labels, icons and topic destinations.
9. Add normal-flow Home band and responsive spacing; compare actual height against the approved study.
10. Connect only the marked hero primary to the existing booking display owner; inspect ON/OFF/unknown labels and targets.
11. Replace only H3-card transform entrance with a480ms child specification/opacity track, no raster wait and immediate focus settling; retain hover, per-card start and resize state.
12. Refine Treatments dark heading bands, shared natural header/body rows, local icon colors and wide-screen space; preserve five-by-five catalogue mapping and unique heading/destination IDs.
13. Add A32 marks inside native layer coordinates; inspect every paper during entry and its existing idle movement.
14. Add About opening facts/actions and keep original A1 art/crop/clock.
15. Build About's two portrait-ready doctor rows, retaining all facts/actions and adding model-backed care links/biography.
16. Give both About doctor panels their own existing-engine clocks at every width; preserve state/font bounds on resize and inspect the unseen second panel after a slow scroll.
17. Group About's practical information within the existing last section; preserve preparation and observation text.
18. Add only new runtime files to the hosting source list; compare original untouched source/scene/assets/review/booking files and inspect the full diff recursively.
19. Render the approved responsive/state matrix; correct issues and repeat relevant views. Use ordinary compilation only as needed. Respect the standing no-test-suite instruction; no unapproved full local/hosted gates or workflow dispatch. No fabricated coverage/pass claim.
20. Update current-state notes and parity register. If publication is approved, commit/push via the official route, inspect actual served source/assets and page/state parity; otherwise return the complete local result. Preserve every earlier version.

## 11. Acceptance and recovery

Accept the design only after actual rendered comparison of each requested field, action, visual surface and movement stage, including hover/focus,320px,768px,1440px, actual ON/OFF presentation and reduced movement. Six Home treatment cards must have no entry translation/rotation/scale; both Treatments heading bands must distinguish category immediately; all A32 marks must stay attached; both About panels must start individually when reached. Preserve eight treatment topic sequences,18Home reviews and their full fields, footer/header, all unaffected scenes, fees/hours and staff-only changes policy.

The static private frames prove only the proposed layout/fade concept. They do not prove the eventual app's lifecycle, active booking, real portrait approval or full suite. Do not call the final website100%complete while those separate facts remain unaccepted. Routine defects during the approved implementation are fix-and-continue work, not repeated approval gates.

Recovery, if publication is later authorized, is a scoped reviewed revert on the clinic repository followed by actual public readback. No database rollback is needed because no stored-data contract changes. Do not reset history, delete old comparisons, swap the booking package, turn booking ON, or promote another client's code as recovery.
