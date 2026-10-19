> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Historical design/planning reference — reviewed 19 October 2026.** Read [current status](../PROJECT-STATUS.md) and the current 18 October plan/delivery first. The text below records its original proposal/source state; its older “current”, “not started” or out-of-scope statements are date-bound. Preserve original/current/new comparisons and use current source before further edits.

# Project 001 — DESIGN AUDIT RESULTS

13 October 2026. Baseline: Doctor-Demo main at `ef0015bc1e35fb82d9439d860e628b66721d4fc9`. Planning only; none of the changes below has been applied to the imported application. The current comparison/imagery/assembly proposal is in 11-comparison-and-richer-visual-plan.md and supersedes the first study's room/portrait direction.

Overall Assessment: The existing navy identity, curved service imagery and staged entrances provide a useful starting point. Dense small text, competing badges, repetitive blue panels and several simulated customer actions currently make the website harder to read and trust.

## PHASE 1 — Critical

- Shared header: It scrolls off screen despite its sticky class; its top was −650px after a 650px page scroll → keep the header in the document scroll context and use `layout.header-height`/`layer.header` → navigation remains available. The application wrapper and global horizontal overflow rules must be repaired together, without introducing horizontal scrolling.
- Treatments on phones: The first section and its only H1 are hidden → move the page heading outside the desktop-only showcase using `type.page-title` → visitors know which page they opened.
- Booking and forms: Essential labels and summary text are frequently below 12px → apply `type.body`, `type.label`, `size.control` and natural page height → dates, names and next actions remain readable on phone and computer.
- Home enquiry popup and mobile navigation: The popup lacks dialog semantics and Escape dismissal; the mobile drawer remains open after Escape and lacks expanded state → apply the common accessible dialog/disclosure specification → keyboard visitors can enter and leave overlays predictably.
- Doctor reviews: Quotes are line-clamped and some attribution text is clipped, with no full-reading action → use `layout.review` plus a Read full review dialog → the content can actually be read.
- Home scroll: The desktop service walkthrough consumes wheel input to force six scenes → retain its curved images and sequential presentation with explicit scene controls and ordinary page scrolling → users keep control of where they go.

Review: Readability, finding one's place and controlling movement come before extra decoration. Booking/payment/message gaps are separately listed below; visual refinement alone cannot make those operations real.

## PHASE 2 — Refinement

- Home: Medicine packets dominate the introduction while the clinic purpose is vague → use `layout.hero`, a plain care heading, a generated illustrative instrument and layered care-line artwork → the first screen explains the clinic and gives a clear next action.
- Home services and Treatments: Six showcase themes coexist with four actual procedure categories → retain the six-scene showcase as presentation while mapping every action to the four existing filter keys → imagery becomes richer without inventing services or dead-end routes.
- All pages: Fixed viewport-height rules and growing root font sizes compress some content and spread other sections too far apart → use `layout.section`, a stable 16px root and content-driven heights → spacing stays balanced at 390, 768, 1440 and 1920px widths.
- About and Contact: Placeholder tours and map-like drawings resemble working media → present only available imagery; use an honest directions action and add a tour only when a real clip exists → users understand what they can actually open.
- Doctor pages: Busy verification badges and stock portraits compete with the doctor's role → use `layout.doctor`, one confirmed qualification group and a complete monogram-led layout without a portrait dependency → the page looks personal without unsupported proof claims.
- Shared visuals: Multiple serif styles, icon sources, heavy cyan shadows and crowded footer text → use the two-font scale, one icon family and quiet depth tokens in DESIGN_SYSTEM → the website reads as one considered design.

Review: Retain the recognizable navy/teal character and strongest image composition. Improve the hierarchy and useful artwork rather than applying identical glowing cards to every section.

## PHASE 3 — Polish

- Entrances: Some Home cards wait over two seconds before beginning to appear → apply `motion.sequence` with a total entrance budget of 1.1 seconds → the page comes together without delaying reading.
- Automatic reviews/backgrounds: Continuous movement lacks a persistent pause control; CSS-only reduced-motion rules do not stop JavaScript timers → apply `motion.preference` and explicit pause controls wherever automatic information movement remains → motion can be stopped. [W3C guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- Hover and focus: Many elements use dramatic shadows or tiny targets without a consistent keyboard state → apply `motion.hover`, `focus.ring` and `size.control` → actions feel responsive and remain easy to use.
- Loading, errors and missing assets: Visual styling is not consistently defined → use the state table in DESIGN_SYSTEM → no blank panel or fabricated success when data or media is unavailable.

Review: Polish follows stable layout and truthful actions. No dark-mode programme is proposed: it does not address this brief and would double the initial visual review work.

## DESIGN_SYSTEM UPDATES REQUIRED

- Approve [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): colour, numeric typography, layout, control, focus, depth, image and motion tokens.
- Approve the page compositions and boundaries in [10-refinement-plan.md](10-refinement-plan.md).
- The local concept is a review artifact, not an approved production redesign or a functioning booking service.

## IMPLEMENTATION NOTES FOR BUILD AGENT

- `src/index.css`: replace viewport-growing root-size rules with `type.root`; replace page-specific fixed-height/hidden-content rules with `layout.section`. Audit every consumer rather than adding another overriding media query.
- `src/App.jsx` and `src/components/Navbar.jsx`: resolve overflow ancestors around the sticky header using `layout.page-overflow`; apply `layout.header-height`. Keep the existing routes.
- `src/pages/Treatments.jsx`: move the H1 outside the hidden mobile hero; use `layout.page-intro`. Keep filter keys `gynecology`, `ultrasound`, `pregnancy`, `physician`; reset to All on a missing/invalid query. Use `state.selected` and `aria-pressed` on filters. Read URL state consistently on back/forward navigation.
- `src/pages/Home.jsx`: preserve service scene data/artwork where approved; replace the wheel/touch interception with `ServiceShowcase` controls. Replace the automatic enquiry interruption with an intentional action. Use `layout.hero` and `motion.sequence` for the new composition.
- `src/components/DoctorTestimonials.jsx`: use `layout.review`; move arrow-key handling to the focused review region; add the full-reading action. Do not alter testimonial claims or create new ones.
- `src/components/Navbar.jsx`, `Footer.jsx` and enquiry/review overlays: implement one dialog focus/close contract, including trigger focus return and scroll restoration. [W3C dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- `src/pages/Booking.jsx`, `Contact.jsx` and the Home form: presentation must not imply operational readiness. Do not add or retain false success in any future customer release; resolve the functional scope first.
- Animate transform and opacity rather than repeated layout measurements; keep layout movement out of critical form interaction. [Browser animation guidance](https://web.dev/articles/animations-guide).

## Separate functional and content findings

These findings are confirmed in the source. They require an explicit operational scope, not a cosmetic patch.

| Finding | Evidence and practical consequence | Decision needed before customer release |
| --- | --- | --- |
| Booking is simulated | `Booking.jsx` uses fixed times, local patient/payment state, a 600ms confirmation timer and a random reference. Local inspection reached confirmation without a booking/payment request. | Agree the official booking-system integration, real availability, payment/provider behavior, cancellation and failure contracts. |
| Receipt is simulated | Its handler changes local state. Clicking it produced zero download events. | Use a real supported receipt source when payment/booking integration is agreed. |
| Messages are not delivered | Home and Contact handlers show alerts and clear local state. Contact displayed “Message sent successfully!” during a local synthetic-data check. | Agree a supported delivery route and truthful pending/success/error behavior. |
| Patient/payment information is entered into a demo | Card/CVV and UPI fields are rendered without a provider. No real payment details were entered during this inspection. | Do not publish this as a working payment journey. Use the provider's supported hosted/tokenized interface in the approved functional work. |
| Clinic facts and imagery are unverified | Doctor portraits load from Unsplash; patient images and “verified”, award, accreditation, years, hours, prices and policy claims are repository content. | Owner must approve facts, reviews and rights for any media actually used. Real portraits are optional and require approval if added later. Project 004 review approval does not validate Project 001. |
| Five high dependency advisories | Install/audit reports five affected packages, zero critical. Four belong to the Tailwind CLI → watcher → micromatch → braces chain; one is source-map-js. | Inspect supported updates and unused CLI usage; no blind forced update or severity-to-exploit assumption. |
| Compatibility routes exist | Old doctor-name paths re-export current profiles; unknown paths go Home. | Preserve aliases during visual work. Agree canonical redirects/404 separately if desired. |

## Evidence boundary

The source inventory covers 10 routes at three widths (30 rendered views), with 8 distinct pages and 58 local image files. Six Home sections and two content sections on most other pages were mapped; Booking has one main section with three local stages. There were zero recorded page errors, zero broken-image observations and no document-level horizontal overflow in that matrix. This is bounded inspection, not a full accessibility, performance, security or release-suite pass.

The 16 `settled-*` screenshots are the preferred phone/desktop evidence. Earlier `source-*` full-page captures sometimes show entrance animations before they fired: the inspection script initially inherited smooth scrolling and was corrected to instant scrolling for capture. Those blank areas must not be reported as missing website content. Interaction observations and the follow-up are both retained; the follow-up corrects initial checks that ran before filter transitions finished or submitted an empty required form.
