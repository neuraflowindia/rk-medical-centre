# Project 001 — Home, Treatments and About refinement plan

18 October 2026 update: the owner approved the complete strengthened plan, separate branch, review, documentation and official publication. Implementation and local review are complete; the [current delivery](../../../0006-qa/2026-10-18-home-treatments-about-implementation/README.md) owns the publication checkpoint. The original inspection/proposal details below record the basis and contracts of this approved implementation. No further approval is needed; the no-tests boundary remains.

## Recommended direction

Build on the current blue/green clinic website. Make the Home introduction patient-focused, make its four choices evenly represent both doctors, simplify only the Home treatment-card entrance, distinguish the two Treatments headings and fill its existing preparation artwork. Give About readable clinic facts and two complete doctor rows with a photograph position on the left. Keep the rest of the site's useful content, images, reviews, meaningful assembly and loops.

Recommended Home heading: **“Expert care for the health concerns on your mind.”** Supporting sentence: “Speak with our doctors about diabetes and everyday illnesses, period concerns or pregnancy.” The established two care summaries and the sentence below the actions remain.

The private desktop study measures Home **860 → 1,075px (+25%)** and Treatments **869.73 → 1,075.47px (+23.65%)**, excluding the shared header. The Home art stays at its existing 760px desktop height; the extra room carries a factual strip. Phone layouts grow to fit useful content; they receive no percentage-based blank padding. The long stacked Treatments opening grows only about 40px at390px, rather than adding25% to an already1,669px opening.

## Open the private review

- [Interactive current/proposed review](http://127.0.0.1:4236/): seven focused section choices, six screen widths, replayable fade study, neutral/photo-placement options and the original reference link.
- [Home proposal](http://127.0.0.1:4236/section.html?mode=proposed&view=home), [Treatments proposal](http://127.0.0.1:4236/section.html?mode=proposed&view=treatments), [About doctor rows](http://127.0.0.1:4236/section.html?mode=proposed&view=about-doctors).
- The review server serves only this private study and the maintained app's public artwork. Start it with `python3 -u serve-review.py` from `study/` if the process is interrupted. It binds only127.0.0.1. Nothing is published.
- Current frames are saved settled HTML/CSS from the actual hosted site. Proposed frames are isolated layout studies. Existing runtime choreography is deliberately not remounted in those static frames; only the Home fade comparison demonstrates new movement. This is not full-runtime, animation or publication parity proof.

The About study defaults to name/initials artwork in the reserved portrait area, matching the established identity approach. Its optional Photo placement view uses the original reference's stock photographs, downloaded only into this private review. The study shell and [content record](content-and-assets.md) explain that outside the customer-like composition. Actual client doctor photographs remain a later replacement, rather than blocking the neutral layout. No new business fact needed inventing: existing confirmed information supplies the proposed layouts. The client can correct wording before publication. The preceding private study is preserved in study/revisions/before-strengthening-20261018/.

## What was inspected

The seven currently public clinic pages were captured on desktop and phone, with the three main openings additionally measured at1920,1440,1024,768,390 and320px. Direct Booking was inspected as its actual OFF response; its form and the separate lookup were source-reviewed only. Project004's newly published Home/About openings and their actual implementation were inspected as read-only references at1440 and390px.

The maintained clinic checkout is clean at `200fdcf50e235d3981268dadc7e5dd356bbeab3f`; GitHub main matched on18October. Its latest runtime release remains `a77f772fbcf1766ea63353f3fc6a32865ddbf2cb`. Hosted JS/CSS names match that release receipt. Their freshly measured hashes are in inspection observations (workspace: 0006-qa/2026-10-18-refinement-inspection/observations.json; retained locally). The ignored local `dist/` is an older449e70a-era build and was not used as the current visual baseline.

## Read with this plan

1. [All twelve comments and their disposition](feedback-register.md).
2. [Exact implementation specifications, owners and dependencies](implementation-spec.md).
3. [Every public page/section: keep, refine or defer](sitewide-audit.md).
4. [Confirmed content, private assets and missing client inputs](content-and-assets.md).
5. [Recursive review and remaining boundaries](review-record.md).
6. Inspection evidence and proof limits (workspace: 0006-qa/2026-10-18-refinement-inspection/README.md; retained locally).
7. [Strengthening findings, exact behavior and future state review](implementation-contracts.md).

The approved programme covers one coherent implementation: preserve a separate return point, build the approved presentation, inspect actual desktop/phone intermediate and settled states, correct issues and update current documentation. The owner expressly included publication in the implementation approval. No new booking provider, rule, resource, fee, schedule, data collection, full test suite or other-client change is required.
