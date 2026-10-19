> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

# Project 001 — current status

> **19 October GitHub publication:** the owner has authorized publishing this documentation. Runtime/closeout commits quoted below identify the inspected base before this documentation follow-up; they are not an assertion that those remain the latest main revision. Git records the current revision. No customer setting or website behavior changes here.

Reviewed **19 October 2026**; latest application delivery remains **18 October**.  **The approved Home, Treatments and About refinement is implemented, reviewed, documented and officially published.** The owner expressly approved the entire programme, separate branch and publication without another approval. [Current delivery](../2026-10-18-refinement/0006-qa/2026-10-18-home-treatments-about-implementation/README.md), [review record](../2026-10-18-refinement/0006-qa/2026-10-18-home-treatments-about-implementation/review-record.md) and its [publication receipt](../2026-10-18-refinement/0006-qa/2026-10-18-home-treatments-about-implementation/publication.json) own the final release state. Runtime source is 09a23ecabc7cebd607cbb4320a4d75e9e0e6497b; the following documentation-only commit does not change it. The [approved plan](../2026-10-18-refinement/0001-planning/plans/2026-10-18-home-treatments-about-refinement/README.md) covers all 12 feedback items and 15 implementation contracts.

Main/maintained HEAD was independently read from GitHub on 19 October as `218f75c34f256919c69fa6b829270040d6ac14ad`, the documentation closeout after runtime 09a23ec. This review changes documentation only. The original import-only scope in unchanged AGENTS.md predates the later explicit implementation/branch/publication approvals recorded in the current plan. It is not the present source selection or a new release permission.

## Delivered presentation

| Area | Current implementation |
| --- | --- |
| Home opening | “Expert care for the health concerns on your mind.” Direct care wording; retained summaries/subtext; Arrange/Book, Treatments, Doctors and Directions actions. Two blue physician/diabetes choices and two green women's-health/pregnancy choices. Four canonical facts. At1440px, opening860→1075px (+25%); original760px art stage and complete stethoscope/curve stay intact. |
| Home treatment cards | Six independent480ms opacity-only entrances, at final geometry. Images load independently; focusing a link reveals only that card. Existing hover, content and other scenes stay. |
| Treatments | Two clear blue/green h2 heading bands; physician symbols blue. Five entries per side, ten links into eight unchanged topics. Shared natural tracks align every row. At1440px,869.734→1075.469px (+23.65%). |
| Preparation artwork | Words and complete checks sit inside the original A32 report/list/note layers. Existing2400/2000ms assembly and 10000ms note loop remain. No raster/crop/geometry replacement. |
| About opening | Two useful actions and three canonical doctor/experience/fee facts. Original instrument scene retained;1440px opening759px. |
| About doctors | Two full-width rows, reserved300×375px desktop portraits, neutral SG/PG artwork, all qualification/institute/experience pills,35/33-word bios, five/four care links, fee/call/about actions. Each row keeps an independent2300/1900ms sequence and 12000ms glint, including resize/font remeasurement. |
| Before your visit | Original preparation and final Contact action retained; exact address/directions, hours, fee and 24-hour observation grouped into four cards. |
| Other pages / reviews | Directory, two profiles and Contact retain their existing content and artwork; actual Map remains. All18Home cards retain photos, ratings, localities, badges and visit labels. Automatic travel/hover pause/still reading remain. |

The source adds three small runtime files: clinic-glance.js/css and preparation-art.mjs. No dependency, database, provider configuration, booking policy, review data, raster artwork, shared master or other-client change. The generated Home metadata now shares the new headline rather than retaining the old title. A narrow360–389px calendar/pen overflow and enlarged-text wrapping were corrected without replacing choreography.

## Review and publication boundary

Review includes39 page/width observations across 1920,1200,1199,1024,768,767,480,479,390,389,360,359,320px, plus 1440px measurements, focused section captures, both Home entry states, image failure/focus, native reduced motion, independent About progress/loop/font handling, all eight topic stages and preserved page views. Corrections were re-observed. Detailed counts, evidence and intentional differences are in the delivery. Browser keyboard zoom did not change this headless browser's scale; doubled-text inspection is recorded honestly as private text enlargement, not native browser zoom.

No tests, lint, type/coverage checks, full local/hosted suite, release gate or workflow dispatch run. Normal `npm run build:hosting` compilation succeeded. No booking, charge, email, message, provider activation or stored-record mutation occurred. A clean compilation alone is not visual or operational booking proof.

## Preservation

Work branch: `work/home-treatments-about-refinement-20261018`. Return branch: `checkpoint/before-home-treatments-about-20261018`, baseline200fdcf50e235d3981268dadc7e5dd356bbeab3f. The baseline receipt fingerprints952 tracked files, including the existing72-file documentation archive;883runtime/repository files precede the new dated documentation archive (880baseline plus 3new runtime files). Exact final repository counts belong to the delivery receipt.

The original reference remains clean at ef0015bc with 85tracked files. Every earlier custom copy/branch/comparison remains. No reset, force-push or old-copy deletion. Recovery is a scoped Git revert through the same official publication route; no data rollback is required.

## Booking and remaining inputs

Current presentation work does not activate booking. The public display remains governed by the actual shared product state. Only the existing header and marked Home hero entry remain usable OFF by opening Contact. Other booking actions/forms and signed OFF routing remain protected. ON artwork/labels were inspected only in an isolated localhost browser response; no provider readiness is inferred.

Confirmed rules remain:₹800 per doctor, clinic visits only, independent doctor schedules, required phone/optional email, online or clinic payment when that method is ready, starting times only, private20-minute capacity, extra1:30pm/8:30pm starts and Sunday evening closed. Patients call the clinic for changes/cancellation. Staff decide, including past confirmed appointments, with reasons/history; moving uses a valid free future time for the same doctor. Refunds are a separate restricted action.

Remaining connections are the pre-existing [guided-launch](0001-planning/plans/2026-10-15-guided-launch/README.md) scope, not unfinished presentation implementation:
- Email: last accepted private readback reported email_sender=false despite the owner's saved Production setting. Protected Vercel reads returned403. The saved value/private original Resend key still needs owner input before diagnosis; do not read the clipboard without a fresh “ready” instruction. No delivery callback is accepted.
- Google staff/records access, independent encrypted recovery and private management credential handoff remain. Preserve the existing NeuraFlow credential; do not reset it. Online payment additionally needs the merchant. At-clinic payment does not require that merchant, but cannot bypass the other booking dependencies.
- Contact submission and optional visit measurement have no approved connected destination. Genuine doctor/facility photos and independent client/patient factual/photo validation remain separate.
- Domain/Git/Vercel/Neon/worker setup is already established. No paid upgrade or new account is required for this presentation.

Prior actual provider/monitor evidence is dated in the guided launch. Those old reads were not repeated as a full suite in this programme. The [16 October handoff](../0008-handover/2026-10-16-project-pause/README.md) and dated Git documentation remain historical snapshots; current delivery takes precedence. Next: return here after the cross-repository documentation review, retain the published presentation, and select the next concrete page request or the recorded guided-launch connection work. No new visual work is assigned yet. The next owner-dependent launch action is a fresh private original email-key/saved-value handoff; do not read a stale clipboard. No wholesale redesign, version deletion, shared-master promotion or paid hosting upgrade is planned, because none is needed for the agreed clinic website.
