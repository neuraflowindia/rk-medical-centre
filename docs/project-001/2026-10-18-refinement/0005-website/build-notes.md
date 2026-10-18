# Website source and build notes

18 October 2026. The approved Home/Treatments/About implementation and local review are complete. [Current delivery](../0006-qa/2026-10-18-home-treatments-about-implementation/README.md), [review](../0006-qa/2026-10-18-home-treatments-about-implementation/review-record.md) and its publication receipt own the official push/readback state. The no-tests instruction remains: ordinary hosting compilation and rendered/source inspection are separate evidence.

## Maintained source and isolated work

Maintained application/Git root: `00001-production-source-code/`, remote `neuraflowindia/rk-medical-centre`. New candidate: `../0006-qa/2026-10-18-home-treatments-about-implementation/candidate/`, branch `work/home-treatments-about-refinement-20261018`. Baseline200fdcf50e235d3981268dadc7e5dd356bbeab3f and all952tracked fingerprints are preserved. Return branch: `checkpoint/before-home-treatments-about-20261018`. Earlier branches, comparison servers and custom copies remain; no force-push, reset or deletion.

The reference remains `00000-source-code/`, clean ef0015bc with85tracked files, downloaded from Prabhakar407/Doctor-Demo under the16October refresh instruction. Its receipt (workspace: 0006-qa/2026-10-16-reference-refresh/README.md; retained locally) records cleanup of old reference downloads; that authorization never covers custom clinic versions.

## Runtime owners

Entry `src/main.jsx`; page/content/motion `src/clinic/`; contained booking adapter `src/booking/`; local media `public/clinic-assets/`.

- `model.mjs`: shared headline, locality/city, roster-derived quick facts and About-specific35/33-word introductions. Existing education, care, fees, hours and phones remain authoritative.
- `clinic-glance.js/css`: three/four escaped semantic factual items, one CSS import; natural phone wrapping, including enlarged text.
- `home.js`, `home-refinement.css`: exact headline/lead, preserved summaries/subtext,4actions,2+2care choices and normal-flow fact band. Home desktop opening1075px; art stage760px unchanged. The hero entry uses a stable label span/icons outside shared text replacement.
- `site.js`: existing product state synchronizes the two exact header/Home entry elements before the generic guard pass. OFF→Contact; ON→booking. No second store, timer, request, submission path or broad guard removal.
- `scene-definitions.mjs` and `choreography-sections.mjs`: own480ms H3-card context plus opacity-only track, c.media=[]; all other registered root durations stay.
- `motion.js`: immediate own-card focus settling; A3children at every width; normalized progress/unseen/loop preservation; font remeasurement through existing120ms queue and disposed listener cleanup. No replacement motion system.
- `treatments.js`, `care-pages.css`: unique h2/aria heading labels, blue/green bands, matched natural header/body tracks at≥768px, five unchanged rows per side. Unsupported-subgrid browsers keep readable equal outer columns.
- `artwork.js`, `preparation-art.mjs`: A32-only text/check markup after each original foreignObject, in native coordinates. No source raster, crop, layer order or T4 assembly/idle change.
- `about-page.js`, `page-parts.js`, `doctor-pages.css`: neutral portrait-ready stacked rows, canonical facts/care/actions, opening band/actions and four practical cards. Other doctor presentations remain unchanged.
- `scripts/display-build.mjs`: generated Home metadata shares the new headline. `appointment-settings/hosting-files.json` adds exactly the three new runtime files.

Visual review also corrected an inherited360px calendar/pen overflow by scaling the existing stage only at360–389px. Internal paths/timing remain. Factual/specialty text and Read all can wrap under doubled text. The approved rendered About role size was effectively17px because of earlier scoped cascade rules; implementation now makes that17px/12px top margin explicit instead of leaving ineffective18/16px declarations. Biography retains18px desktop/17px phone, existing effective spacing and the exact approved section height.

## Preservation and proof

The previous880runtime/repository files become883with the three additions; the dated documentation archive is counted separately. All34top-level scene definitions, eight topic sequences,26source review pairs and26local portraits remain. All18Home cards keep full metadata and automatic movement/hover pause. Original raster/media bytes and595 sealed package files remain unchanged; the delivery records the source comparison.

Local compiled preview: http://127.0.0.1:4237/. Private proposed/current study: http://127.0.0.1:4236/. Both require their processes. The earlier4220comparison and4221candidate remain preserved historical versions; do not present them as this release.

Actual review covers the full responsive/state matrix and targeted intermediate/settled motion. Full-page captures explicitly settle below-fold scenes and decode imagery; separate natural-entry observations establish admission behavior. Browser keyboard zoom has no effect in this headless session, so enlarged-text evidence is labelled private text stress. No native-zoom certification or error-free/perfect guarantee is claimed.

No automated tests, lint, type/coverage checks, complete local/hosted suite, release gate or workflow dispatch run. Compilation uses `npm run build:hosting`, producing7public/3booking/6backend surfaces. Existing large booking/font chunk advisories remain; no dependency/chunk overhaul belongs here.

## Hosting and booking boundary

Vercel framework Vite, repository root, install `npm ci`, build `npm run build:hosting`, output `dist`. Preserve root vercel.json, middleware.ts, contained Python entry and exact requirements. No generic all-path Home rewrite. Hosting source export includes all sealed package files. Package1.1.0-rc.1 digest remains9fe113a12c8b3f15c50fcab45d50d896420922fd86f4c791fbcc1bbbba19846e.

Official publishing is the existing clinic Git main route; no Codex Vercel connector/account switch. Verify actual served asset identities and rendered pages after the push. Recovery uses a scoped revert with the return branch for comparison, without resetting shared history or data.

Booking remains OFF until its actual dependencies are ready. Separate doctor schedules,₹800clinic visits, optional online/clinic payment, private20-minute capacity, extra1:30pm/8:30pm starts and Sunday-evening closure stay. Patients call for changes; staff decide with reasons/history; refunds remain separate. No booking, payment, email, message or customer mutation occurred here.

Guided launch (workspace: 0001-planning/plans/2026-10-15-guided-launch/README.md; retained locally) owns unfinished email/saved-setting diagnostics, Google staff/records, independent encrypted recovery, merchant and management handoff. Contact submission/optional measurement lack approved destinations. Genuine doctor photos and independent content/photo approval remain later inputs. Prior provider/monitor evidence remains dated; presentation publication is not their fresh acceptance.
