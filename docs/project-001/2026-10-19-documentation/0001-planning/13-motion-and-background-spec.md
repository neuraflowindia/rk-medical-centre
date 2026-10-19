> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Historical design/planning reference — reviewed 19 October 2026.** Read [current status](../PROJECT-STATUS.md) and the current 18 October plan/delivery first. The text below records its original proposal/source state; its older “current”, “not started” or out-of-scope statements are date-bound. Preserve original/current/new comparisons and use current source before further edits.

# Project 001 — movement and background details

13 October 2026. Strengthened proposal, not built. Read [the plain-language page guide](14-page-by-page-review-and-wording.md) for the purpose and words of each section. This document gives the builder the exact movement limits. The original application and first preview remain unchanged.

## Design Intent

Use a strong opening, a lighter service entrance and a clear visit-step assembly. Then let people read. Do not repeat the same visual trick in every section. Pictures and decorative lines may move into position; treatment labels, instructions, names and buttons stay readable. The single repeating effect is decorative opening artwork, not treatment selection or booking progress.

## Opportunities table

Locations identify the frozen first study under `0006-qa/2026-10-13-inspection/`. They identify the original planning seams. The delivered implementation is in `0006-qa/2026-10-13-comparison-build/proposed/motion.js`, `dialog.js` and `site.css`; the frozen first study is not modified. The first three are occasional page introductions; repeated controls have much shorter timing.

| # | Location | Today | Purpose | Frequency | Suggested motion: Implementation Spec |
| --- | --- | --- | --- | --- | --- |
| 1 | `concept/index.html:33` → opening artwork | Static room picture | Explanation and delight | One opening per Home visit | 2000ms desktop / 1400ms phone. Four overlapping stages: background, whole instrument, care line, finish. Object x96px/y56px, rotation −10°, scale .84 → final. Words/actions usable immediately. |
| 2 | `concept/index.html:36` → Home care cards | Simple cards | Explanation | Once per section entry | 1400ms as a group on computers/tablets; below 480px each visible row gets its own ≤650ms entrance. Animate image bands only: alternating x±36px/y20px/scale .94 → final over 650ms, start at 120ms with 90ms stagger. Quiet image-edge details finish by 1400ms. Labels, links and card layout stay still. No second Home service story. |
| 3 | `concept/index.html:45` → visit steps | Static three-node line | Explanation | Once per section entry | 1800ms total. Supporting image x40px/scale .94 → final in 650ms; path mask grows from t350–1800; number circles rise 24px over 500ms at t600/840/1080. Words never wait. Phone path is vertical; number travel ≤16px. |
| 4 | `concept/concept.js:23` → treatment selection | Immediate card visibility | State indication | Occasional | 240ms opacity crossfade/≤12px translate in the one selected detail area. All treatments shows four summaries; choosing one replaces that area with its detail. Do not show duplicate full cards plus details. Keep filter/focus state steady and last valid image during loading. |
| 5 | `concept/index.html:33` → opening accent | Finite line entrance | Delight | Passive viewing after one opening | Exactly one permitted ambient effect: a 14s decorative care-line glint, opacity .10→.18→.10, optional translate ≤6px. Main instrument and words stay still. No service-selection or step-number loop. |
| 6 | `concept/index.html:36` and `:45` → actions and numbered instructions | Existing lift | Feedback | Repeated | Clickable cards may lift −4px over 220ms; buttons press to .99 over 120ms. Instruction articles keep default cursor and do not lift like buttons. Their circles may receive a 6px teal .08 halo, with unchanged 700 numeral weight. No fake keyboard stops on instructions. |
| 7 | `concept/concept.js:42` → detail reader/menu | Immediate opening | Spatial consistency | Occasional | Pointer open opacity/translateY(8px)→0 in 200ms; close ≤160ms. Keyboard focus/open has no movement delay. Escape, close and focus return must work throughout. |

Entry/action easing: `cubic-bezier(.22,1,.36,1)`. Ambient easing: `ease-in-out`. Hover only on fine-pointer devices supporting hover. Reduced motion: final states, no drawing/travel/loop; optional state opacity ≤100ms. No movement is required to reveal essential words or finish an action.

## Opening sequence

| Elapsed | Layer | Bounds / final behavior |
| --- | --- | --- |
| 0–450ms | One pale-blue backing shape | scale .78→1, x24px→0; origin 70%/50%; contained behind the object. The reading background stays steady. |
| 150–1000ms | Whole generated stethoscope | x96px/y56px, rotation −10°, scale .84→1; opacity appears in first 250ms. Do not separate instrument parts or invent a measurement. |
| 500–1350ms | One native care line | Short transform-mask reveal; endpoints remain fixed. No satellite icons, orbital rings, ECG or moving labels. |
| 1300–2000ms | Final placement and shadow | Finish remaining ≤4px decorative travel and settle shadow. Do not add an empty wait after the last visible change. |
| After 2000ms | Optional care-line glint | One 14s cycle, decorative only. Not a loading state or heartbeat. |

Heading/body/buttons are visible and usable at the start. A short ≤350ms/8px copy introduction may be used only if focus immediately settles it; the default layout remains visible if animation never runs.

Larger computer artwork: image 440–540px, region about 520–580px high. At 1024–1279px, image 320–440px with a roughly 380–480px natural artwork region. These are bounded targets, never minimum widths: cap the image at the available column minus 32px edge space. Subject edges stay ≥16px from clipping. Copy column about 52% of available row space, artwork 48%, gap 40–56px, max content 1280px. The whole image keeps its aspect ratio and does not enter button/text space.

Phone: copy first, artwork 280–340px high, object 250–300px wide. Entry travels halve to 48px/28px/−5°; duration 1400ms. Timings compress proportionately. No extra motifs are added to fill the smaller picture. At 320px preserve type and gutters before decoration; natural height may grow. Optional phone glint changes opacity only.

## Service and visit-step layout

Home service layout: four columns at ≥1100px; two columns at 480–1099px; compact picture/text rows below 480px. Narrow-phone pictures 96–112px square (88px permitted at 320px), remaining text width at least 140px where feasible; 12–16px gap and 16px row padding. If words require more room, increase row height or reduce the thumbnail, never shrink body below 16px or clip a title. Wider-card images keep 3:2. Verify the actual generated image in both crops. Normal phone entry observes each row separately so lower rows do not finish before the reader reaches them. A private replay/slider may pose the group together for inspection, without auto-scrolling; it must not alter normal once-per-row entry. No connecting progress line or decorative step numbers between unrelated treatment cards.

Treatments page: its selected detail uses about 60:40 image/copy on wider computers and one column on phones. Its four categories remain visible as selection controls. Do not clone the Home service assembly as a second showy entrance for this page; a short image entrance ≤500ms is enough.

Visit steps: one continuous line through three fixed-size circle centers, horizontal on computers and vertical on phones. Text blocks do not move to meet the line. Use untransformed layout offsets for line geometry; recalculate after fonts/width changes. The image occupies a supporting area, not half the section at the expense of the instructions. Observe the step block itself for its line/number entry; do not trigger the steps merely because an earlier supporting picture became visible. Final line/numbers stay still. Pointer emphasis never suggests that an instruction is a button.

Doctors, About and profile sections use at most a short ≤450ms image/illustration introduction. Doctor names, qualifications and review text remain steady. Contact and Booking backgrounds do not loop or track the pointer.

## Background rhythm

| Area | Intended surface |
| --- | --- |
| Home opening | Pale blue `#EAF3FC` beside/behind the instrument, warm white `#FFFBF4` reading space. One small mint accent allowed; no three-colour full-screen gradient. |
| Home services / Treatments | White `#FFFFFF`, with contained blue/cream picture fields. A quiet 1px line makes the section boundary clear. Peach belongs only in small image details. |
| Home doctors | Navy `#1B365D`, warm-white names and pale-blue supporting text. This is the main dark chapter, not another animated colour reveal. |
| Home visit steps | Warm white with a restrained mint `#E7F4EF` field behind the supporting picture/path. Text stays on a stable, readable surface. |
| Feedback | White/warm white, navy quote text. No moving background or automatic quote changes. |
| Home closing / Contact | Pale-blue closing band; warm-white contact details followed by a separate white question form. Avoid a dark closing block fused into the dark footer. |
| Booking | Static pale-blue perimeter, white form/calendar, stable teal selections. No peach/mint category colouring on appointment slots. |

Navy, warm white and blue lead. Mint supports selected artwork; peach is an accent, not a gender-based section colour. One clear colour change does more useful work than boxing every paragraph. Decorative overlays never sit on top of words.

## Ownership, repeated actions and failures

Use separate nested layers/properties for entry, hover and the single ambient effect. Replaying cancels old work before resetting. The private scene controller exposes play/pause/seek/settle/dispose; the same elapsed progress drives playback and the comparison slider. No second approximate sequence for scrubbing.

One-shot section entry begins when meaningful artwork is visible. If the reader skips it, reaches an action by keyboard, or loads with reduced motion, settle immediately. Do not restart an entrance merely because a section leaves and returns to view. Explicit Replay in the private tool is different from normal site reading.

Read geometry after layout/fonts are ready; use coalesced ResizeObserver updates, not per-frame layout reads. Resize preserves the new sequence's progress and recalculates final positions. An observer, image or animation failure leaves the final readable layout. Do not wait for every below-fold image before showing the opening.

The 14s opening accent runs only when visible, tab shown, proposed pane visible and motion enabled. Parent hide/layout changes pause it without unmounting the frame. User pause survives automatic visibility changes. Scrubbing pauses ambient movement. Reduced-motion changes settle immediately; Replay does not silently override that preference. No extra service/step loop may be introduced as a convenient reuse of the same helper.

The comparison tool has one control for new-design motion. A later customer implementation retaining the loop would need one quiet shared Motion on/off control, not scattered background Pause buttons. Automatic moving information needs appropriate stop/pause behavior; stopping only during hover/focus is insufficient. [W3C guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

Use transform/opacity as the starting point and keep expensive continuous blur/filter effects out. Native line masks are finite. Inspect actual runtime smoothness after building; no API guarantees it by itself. [Browser animation guidance](https://web.dev/articles/animations-guide).

## Rejected effects

- A second Home service explainer: repeats information and slows the route to the doctors.
- Automatic category changes, moving selected treatment or pulsing step numbers: distract from reading and can look like loading/progress.
- Spinning instruments, satellites, ECG traces and heartbeat flashes: no useful explanation and possible false medical meaning.
- Large floating initials, bouncing doctor cards or a different animation style on each profile: distract from the names and areas of care.
- Global wheel capture, mandatory waiting, full-window cursor effects and WebGL particle backgrounds: add effort without helping the visitor's next decision.
- Loops beside booking/contact inputs: the person is reading or typing; keep the page steady.

## Final review after building

Inspect the beginning, middle and finished layout on 390×844 and 1440×900, plus 320/768/1920 widths. Check actual square service crops, long labels, no word-per-line layouts, focus during entry, rapid category changes and replay/pause/seek. Check resize, hidden tab/pane, runtime reduced motion, failed/lazy images and stale decode callbacks. The original side must keep its authored behavior.

These are focused checks for the proposed local build, not a full local/hosted release suite. The approved implementation and focused checks are complete. Beginning/middle/finished scenes, responsive observation, pause/replay/seek, reduced motion, failure behavior and image budgets have local evidence in the comparison guide (local workspace reference: `03-client-projects/001-doctors/0006-qa/2026-10-13-comparison-build/README.md`). Owner review and real-device/customer acceptance remain separate.
