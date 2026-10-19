> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Dated plan, not the current task list.** Reviewed 19 October 2026. [Current project status](../../../PROJECT-STATUS.md) points to the implemented/published 18 October refinement and the separate unfinished guided launch. Keep this plan and its comparison evidence; do not replay its completed work or interpret an old local-only status as today's publication state.

# Home page — additive refinement plan

Status: **IMPLEMENTED AND PUBLISHED. Patient feedback uses 18 automatic reviews; no tests were run, as instructed.**

16 October 2026. Maintained website: `0005-website/00001-production-source-code/`, main `cbe45f7a135a973b6984d59276a6bf467e024204`. Reference: the single fresh Doctor-Demo copy at `0005-website/00000-source-code/`, main `ef0015bc1e35fb82d9439d860e628b66721d4fc9`. Both live Home pages and the local reference informed the approved design. Implementation is in a separate candidate, with the pre-refinement source preserved. Credentials and providers are unchanged. See the implementation record (local workspace reference: `03-client-projects/001-doctors/0006-qa/2026-10-16-home-implementation/README.md`) for current publication status.

The owner approved the reviewed Home refinement, including publication, after comparing the supplied reference. Build on the established website and preserve the earlier custom versions. Feedback on the next page remains a later discussion.

Read feedback register (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-16-home-augmentation/feedback-register.md`), implementation specifications (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-16-home-augmentation/implementation-spec.md`), research and reference lessons (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-16-home-augmentation/research.md`), review record (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-16-home-augmentation/review-record.md`), and interactive design review (local workspace reference: `03-client-projects/001-doctors/0001-planning/plans/2026-10-16-home-augmentation/review.html`). Open the running study at http://127.0.0.1:4211/. Its eight tabs offer current/reference captures, a proposed layout, phone width, motion replay and review browsing. The HTML shows private design studies, not an implemented or published clinic website.

## Approved owner amendment

The owner approved implementation and publication on 16October 2026, explicitly requiring18 reviews moving automatically, stopping on mouse hover and resuming when it leaves. This replaces the earlier fixed-featured/click-navigation review proposal. Use18 existing source pairs; retain all 26 source records. The instruction “Do not run any tests” overrides the earlier verification sequence for this execution. Source review, visual inspection and ordinary hosting compilation remain in scope. The older private HTML review pane is retained as planning history; implementation follows this amendment.

## Recommendation

Retain the hero composition, complete stethoscope, rounded backing, main green curve, four specialty choices, Lora/Lato, navy/teal/cream identity, all original review quotation/author pairs, and useful existing assembly. Enrich the Home sections around them. Keep the standard booking system and its deliberate OFF state.

| Area | What is actually present | Recommended augmentation | Alternative considered |
| --- | --- | --- | --- |
| Hero/care boundary | Both sections are cream. The blue visit form between them disappears while booking is OFF. | Keep hero cream; make care mint, with one crisp full-width edge. Check both booking states. | A divider alone is smaller but does not give the care area enough distinct presence. |
| Care artwork | Three coherent cream paper illustrations, two transparent cutouts, one blue instrument photograph. | Retain the three coherent images. Create three matching paper compositions for diabetes, fever and ultrasound. One 3:2 rounded media surface each. | Six cutouts would require rebuilding valued figure artwork and increase replacement work. |
| Doctors | Two compact side-by-side cards, brief descriptions, qualifications and lists. | Two full-width stacked features with identity/photo space, readable introduction, visible facts, care topics and next actions. | Two enlarged columns still divide attention and constrain each profile. |
| Calendar | A blank calendar bitmap inside an existing multi-act desk sequence. | Add real vector dates attached to the calendar face; keep all existing desk acts. | Regenerating the entire artwork risks losing the existing assembly geometry. |
| Visit steps | A connecting line and one entrance highlight, ending on step 3. | Add a recurring 1→2→3 highlight and travelling line accent; real hover lift/shadow/glow with constant fill. | Another generic fade would not explain the process or meet the requested movement. |
| Reviews | Eight Home quotes retained; two visible, six behind a disclosure. Initials only. | 18 existing pairs in one automatic row, hover pause/resume, optional still Read all list and reduced-motion fallback. | The earlier fixed featured reader and previous/next controls were superseded by the owner's amendment. |
| Visit benefits/forms | A real shared visit form and careful popup already exist, intentionally hidden while booking is OFF. | Enrich that existing area when booking opens; add fee/saved-details/available clinic-payment benefits and keep one draft/form. General questions use the supported Contact journey. | Copying the reference alert-based form would create a fake success path. |
| Buttons | Background/shadow changes, but rules explicitly disable translation and press movement. | Reconcile those rules and add bounded lift, glow, arrow response and press feedback. | Stacking another overriding CSS file makes ownership brittle. |
| Footer | Three sparse columns, unlabelled phone numbers, no hours/direction/lower bar. | Four useful groups, doctor-labelled contacts, actual appointment hours, directions, confirmed facts and a restrained lower strip. | Dead social icons and unconfirmed promises would add apparent richness without usefulness. |
| Motion reliability | Resize settles even unseen scenes; desktop cards share one clock. | Preserve unseen states on resize and give visible care/doctor panels their own clocks. | Longer timelines alone cannot fix entrances played before their section is reached. |

## Existing versus proposed page order

Use titles and stable IDs when recording feedback; visible numbering changes with booking state.

| Existing ID | Booking OFF now | Booking ON later | Proposed role |
| --- | --- | --- | --- |
| H1 / opening | Hero | Hero | Same composition; stronger action feedback and clear lower boundary. |
| H2 / visit-start | Hidden | Book your visit form | Existing form, richer benefits beside it; no duplicate capture form. |
| H3 / care | Visible section 2 | Visible section 3 | Same six topics and links, coherent imagery and distinct section surface. |
| H4 / doctors | Visible section 3 | Visible section 4 | Two stacked, fuller doctor features. |
| H5 / visit | Visible section 4 | Visible section 5 | Preserve desk assembly; dated calendar and looping three-step explanation. |
| H6 / feedback | Visible section 5 | Visible section 6 | 18 existing reviews in an automatic rail, with hover pause and still reading. |
| H7 / next | Visible section 6 | Visible section 7 | Useful question/contact ending, connected to the expanded footer. |
| Shared footer | All routes | All routes | One consistent footer, with availability-aware actions. |

No section is silently deleted. The benefits from the reference's two booking-promotion areas are combined with H2/H5 instead of adding two repetitive banners.

## What we learned from the reference

The reference gives the doctor a larger identity area and multiple ways to understand the same information: a brief role, a readable introduction, short qualification labels and clear next actions. Its reviews have author images, rating positions and consultation labels. Its footer gives visitors several practical ways forward. These are worthwhile lessons.

It also uses a stock Unsplash person as the doctor, static verification/recommendation claims, repeated KGMU labels, eight unique reviews repeated into 32 cards, obsolete Sunday hours/cancellation wording, generic social destinations and unconfirmed digital-prescription promises. These are reference shortcomings, not new clinic facts. Keep our confirmed hours, contact-only changes/cancellation, approved Maps pin and source review pairs.

## Information approach

Doctor copy stays warm, direct and in third person. Education, long practice and care areas are presented both as short facts and a short explanation. No invented degree, registration verification, clinic founding date, treatment guarantee or patient total.

For Sanjay, the draft explains his confirmed MBBS/DGO education at King George's Medical University, practice since 1992, and general health/diabetes work. For Parul, it explains her confirmed KGMU gold medal, practice since 1992, and women's health/pregnancy work. "30+ years of practice" is supported by the confirmed start year; "Verified Specialist" is not established by a layout reference.

The private review study can demonstrate varied rating/locality/photo positions as the owner requested. Those are explicitly separate design fixtures, not added to `content.mjs`. Publishable patient metadata/photos/badges require clinic confirmation of accuracy and permission. Existing source quotes/names stay unchanged; no overall rating or recommendation percentage is manufactured. Age/gender are optional future content, not the default Home metadata.

Actual doctor photos can replace prepared name/initial identity areas later without changing layout. Neither stock people nor generated faces should be labelled as the named doctors.

## Scope and upstream/downstream effects

- Home-specific doctor/care/review rendering must not alter Doctors, doctor-profile or Treatments content through their shared renderers. Use explicit Home presentation options or new small Home helpers.
- Shared footer and shared button treatment affect other pages. The proposed programme includes checking their layout, focus, active and unavailable states across the existing routes, not redesigning those pages.
- The motion resize repair is shared infrastructure. Preserve timings, state disposal and native reduced-motion behavior; review source and rendered movement. The owner explicitly excluded tests for this execution.
- The visit form remains the standard booking entry: name/phone/doctor required, email optional; only in-memory draft reuse; no patient details in URLs/storage; current prompt suppression retained.
- Booking OFF still hides booking-only links/forms. No artwork calendar, design-preview switch or payment label can enable the real service. General enquiry submission remains unavailable until its protected connection works.
- No booking engine, stored-data model, fee, schedule, payment account, cancellation rule, provider, private value or domain change is part of this refinement. Normal hosting compilation regenerates the existing public pages/sitemap.
- One future isolated candidate will be created from the verified clinic source after approval. Current production and earlier custom design studies remain preserved. No deletion or overwrite of those versions is included.

## Approved implementation sequence

The implementation record owns completion and publication evidence. These are internal steps covered by the owner's approval.

1. Preserve the current public source at cbe45f7 in a detached worktree.
2. Create the separate Home candidate from that exact source.
3. Map Home/shared boundaries, existing assets, quotes and booking guards.
4. Reconcile button/step CSS that suppressed movement.
5. Add the mint care surface and one section edge.
6. Export the three approved matching artwork concepts at three widths each.
7. Integrate six consistent 3:2 care images without changing the three retained images.
8. Add two stacked Home doctor features using confirmed facts.
9. Assign independent care/doctor child clocks and owned media.
10. Preserve Home scene progress on resizing.
11. Attach current India-month dates to the existing moving calendar.
12. Add the repeating three-step explanation and hover glow/lift.
13. Compose 18 exact existing review pairs without changing the source collections.
14. Add continuous automatic travel, hover pause/resume and still reading.
15. Enrich existing visit-form benefits while preserving booking OFF and one draft.
16. Retain the supported question/contact ending without an invented enquiry destination.
17. Expand the shared footer with actual contacts, times, Maps and credentials.
18. Review desktop/phone layouts, settled/moving/hover/reading states and shared pages; correct findings.
19. Review the whole source change and compile the hosting output. Run no tests, as explicitly instructed.
20. Update documentation, publish through the existing clinic repository connection and visually confirm the public result.

## Completion of this planning pass

Three helper audits covered content/reference accuracy, image/layout consistency, and animation/form wiring. Fresh live/reference captures cover desktop and phone Home. Source findings were rechecked by the root agent. Research, alternatives, layout numbers, timeline/state rules, asset needs, shared-component consequences and remaining content inputs are documented. A private interactive study lets the owner inspect the proposed directions. The owner approved implementation and publication with the 18-review amendment. The private study remains an earlier design reference; the separate implementation record reports current application and publication evidence.
