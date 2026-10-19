> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Dated plan, not the current task list.** Reviewed 19 October 2026. [Current project status](../../../PROJECT-STATUS.md) points to the implemented/published 18 October refinement and the separate unfinished guided launch. Keep this plan and its comparison evidence; do not replay its completed work or interpret an old local-only status as today's publication state.

# Project 001 — content and design restoration plan

14 October 2026. **Planning and visual studies; website implementation has not started.** This is the current plan following the owner's rejection of the Next hero and loss of useful original information.

## Open the work

- [Interactive visual studies](http://127.0.0.1:4196/study.html): six views — Home opening, Doctors, individual profile, treatment detail, patient reviews and clinic credentials. Switch doctors/topics, expand the reviews, replay or scrub the proposed entrances. These are section studies, not a completed replacement website.
- [Original / Current / Next comparison](http://127.0.0.1:4195/__review/compare/): all three preserved versions remain available.
- Content inventory and page map (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-content-and-design-restoration/content-map.md`): what existed, what was lost, where each item belongs and optional information worth adding.
- Exact design and implementation specification (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-content-and-design-restoration/implementation-spec.md`): every existing page and section, numeric layout values, artwork, motion, interaction states and connected behavior.
- Owner confirmations (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-content-and-design-restoration/confirmed-facts.md`): education, experience, accreditations and observation care.
- Review record (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-content-and-design-restoration/review-record.md`) and saved screenshots (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-14-content-and-design-restoration/evidence/gallery.html`): findings, corrections, checks and limits.

## Main findings and proposal

| Finding | Proposed correction |
|---|---|
| Current's complete stethoscope became a small circularly clipped image; the green curve disappeared | Restore the original whole asset, organic blue shape and green line; keep four specialty choices |
| Hero supporting copy was cut down | Restore useful care wording, icon-led labels and sentence below actions |
| Doctor education, experience and biographies were stripped down | Confirmed facts across Home summaries, fuller Doctors page and detailed individual profiles |
| Source has 26 reviews; Current and Next retain only 20 | Restore six missing Doctors-page reviews; make all four original groups visibly accessible |
| Eight topic titles did not preserve the original service detail | Add the missing details within the existing two chapters/eight topics |
| Confirmed clinic credentials and observation care are absent | Add straightforward About/Contact information, without invented seals or exaggerated promises |

Keep the existing 32 artwork assignments, six Home treatment tiles, visit form/pop-up, draft handoff, privacy choices, existing page routes and unaffected choreography. The revised studies retain the relevant generated objects; the hero needs corrected framing, not a replacement image.

## What happens after review

Agree on this restoration programme, then implement the local Next revision continuously: shared content, hero, doctor detail, reviews, treatments, clinic facts, comparison mapping, focused checks and documentation. Original and Current stay frozen. The current Next will also be snapshotted before that work.

This round does not integrate into the application, run full release suites, commit, push or publish. There is no outstanding blocker to reviewing the plan. Source-only operational details and optional new client material remain explicitly separated from owner-confirmed facts; they are not fabricated to fill a design.

## Restart after an interruption

The saved studies remain available even when their local viewers stop. Start the existing comparison viewer from `0006-qa/2026-10-13-additive-build` with `node review-server.mjs`. Start this plan's viewer from this folder with `python3 -m http.server 4196 --bind 127.0.0.1`. Do not start duplicate servers if ports 4195/4196 already answer. Both are local-only; the study uses artwork served by the comparison viewer.

`audit-source.py` inventories the exact source review groups and verifies 109 protected source/design fingerprints against the beginning of this review. Its artwork snapshot copies existing composition coordinates into a private study data file; it does not change the authoritative artwork or website.
