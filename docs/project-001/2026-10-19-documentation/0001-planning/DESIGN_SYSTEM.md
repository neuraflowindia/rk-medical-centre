> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Historical design/planning reference — reviewed 19 October 2026.** Read [current status](../PROJECT-STATUS.md) and the current 18 October plan/delivery first. The text below records its original proposal/source state; its older “current”, “not started” or out-of-scope statements are date-bound. Preserve original/current/new comparisons and use current source before further edits.

# Project 001 — proposed design system

13 October 2026. Revised proposal for owner review. The imported application and first study have not adopted these revised values. Current imagery, comparison and staging rules are in 11-comparison-and-richer-visual-plan.md, 12-generated-image-briefs.md and 13-motion-and-background-spec.md; 14-page-by-page-review-and-wording.md owns the section order and intended customer wording.

## Design intent

Keep the supplied clinic name/logo and navy identity. Warm white and pale blue lead; mint supports a few areas and peach stays in small image details. Use generated object pictures, clear paper illustrations and code-drawn care artwork. The opening assembles strongly; later sections use shorter, varied entrances. Keep words and controls steady, with no forced scrolling or photo dependency.

## Implementation spec: tokens

| Token | Proposed value / rule |
| --- | --- |
| `color.navy` / `color.ink` | `#1B365D` / `#16324D` |
| `color.teal` / hover | `#0A706B` / `#085C58` |
| `color.paper` / `color.white` / `color.sage` | `#FFFBF4` / `#FFFFFF` / `#E7F4EF` |
| `color.powder` / `color.peach` | `#EAF3FC` main light field / `#FCEDE7` small image accent only; no gender-based peach sections |
| `color.body` / `color.muted` / `color.line` | `#455865` / `#5E6C70` / `#CAD8D5` |
| `color.error` / `color.success` | `#A82F36` / `#16634A`; always pair with text/icon |
| `type.root` | 16px at all widths; respect browser zoom and text scaling |
| `type.display` | Lora, 500; 52–60px desktop, 34–40px phone; line-height 1.12; tracking −0.035em |
| `type.page-title` | Lora, 500; 44–52px desktop, 32–38px phone; line-height 1.15 |
| `type.section-title` | Lora, 500; 36–42px desktop, 28–32px phone; line-height 1.2 |
| `type.card-title` | Lora, 500; 23–28px desktop, 22–25px phone; line-height 1.25 |
| `type.body` | Lato, 400; 17–18px introduction, 16px ordinary copy; line-height 1.6 |
| `type.label` / `type.meta` | Lato 700 / 400; 14–16px / 14px; line-height 1.4–1.5 |
| `type.button` | Lato, 700, 16px, line-height 1.3; no all-caps long CTA |
| `layout.container` | max 1280px; inline gutter 20px phone, 32px tablet, clamp(32px, 4vw, 64px) desktop |
| `layout.section` | 72–88px vertical padding desktop; 48–56px phone; no fixed height or content clipping |
| `layout.page-intro` | 48–64px vertical desktop, 36–44px phone; readable width 680px |
| `layout.hero` | 52:48 text/media columns ≥1024px; gap 40–56px. Image capped at available column minus 32px, 320–440px at smaller two-column widths / 440–540px on larger computers. Natural-height region; min-height 600px desktop may grow. Below 1024px stack copy before artwork; phone art height 280–340px. |
| `layout.header-height` / `layer.header` | 80px desktop, 72px phone minimum, can grow at text zoom; sticky top 0; z-index 40 |
| `layout.page-overflow` | document scroll; no overflow-hidden ancestor around sticky header; local artwork may clip its own decorative layer |
| `layout.grid` | 12 columns desktop, 6 tablet, 1 phone; 24–32px gaps. Home services: four cards ≥1100px, two 480–1099px, compact image/text rows below 480px. |
| `layout.doctor` | Complete name/role composition; optional initials 48px desktop, 40px phone; no large blank portrait frame or photo dependency |
| `layout.review` | quote max 65 characters per line; body 17px; no unreadable overlapping quote panels; full text available by native dialog; manual controls |
| `size.control` | controls ≥48px high, tap targets ≥44×44px; text inputs 16px; form labels explicitly associated |
| `radius.card` / `radius.media` / `radius.control` | 24px / 32px / 12px; buttons may be pill-shaped, content panels are not ovals |
| `border.default` / `state.selected` | 1px line; selected 2px teal plus 700 weight and programmatic selected/pressed state; no size shift |
| `depth.card` / `depth.hover` | 0 12px 32px rgba(27,54,93,.08) / 0 18px 40px rgba(27,54,93,.12) |
| `focus.ring` | 3px teal outline, 4px offset; light outline on navy; never color alone |
| `image.instrument` | Transparent whole hero object; six-image brief owns subjects/crops; reserve dimensions; no generated room, patient, brand or diagnostic result |
| `image.people` | only owner-approved real portraits; no AI substitute represented as a named doctor or patient |

Text/background combinations must meet 4.5:1 for ordinary text and 3:1 for large text/essential UI. The implementation check must calculate actual final pairs, including hover and disabled states; the token palette alone is not a conformance claim.

## Artwork and motion

| Token / area | Design intent and implementation spec |
| --- | --- |
| `art.care-line` | One decorative opening line; a separate line connects the three visit steps only. Do not connect the four independent treatments as a process. SVG strokes 1.5–2px, teal/ink, sage fills; 160–280px artwork desktop, 100–160px phone. Medical motifs remain symbolic, never fabricated diagnostic results. |
| `art.ultrasound` | Fan/arc motif; `art.pregnancy` nested protective arcs; `art.physician` stethoscope path; `art.womens-care` botanical/care path. Decorative SVGs aria-hidden. Category names carry meaning. |
| `motion.sequence` | Main marketing chapters: hero 2000ms desktop/1400ms phone; service image bands 1400ms as a wider-screen group / ≤650ms per narrow-phone row; visit steps 1800ms, per 13-motion-and-background-spec.md. Other entrances ≤1100ms total. Copy/buttons usable immediately; no scroll locking. |
| `motion.hover` | Fine-pointer hover lift −4px over 220ms; image scale ≤1.025; icon translate 3px. Keyboard focus gets the same visible emphasis without requiring movement. |
| `motion.scene` | Manual category/detail change: 240ms opacity/≤12px translate in the single selected detail region; last valid image remains until new media is ready. Controls respond immediately. Original six source themes map to four real category keys; the revised study presents four labelled categories. |
| `motion.artwork` | Native artwork assembles with its chapter. Exactly one permitted repeating decorative opening accent: 14s care-line glint. No service-selection or numbered-step loop; no moving information. Shared motion control, visibility pause and reduced-motion settling. |
| `motion.preference` | Reduced motion: no drawing, drift, sliding or parallax; direct scene changes, optional opacity ≤100ms; stop JavaScript timers as well as CSS. |
| `motion.performance` | transform/opacity on visible content; no continuous offscreen loops or per-frame React state; disconnect observers/listeners on unmount. Avoid will-change on every card. |

The first five-view prototype is a frozen earlier study. The revised eight-page comparison and new image/assembly package are implemented outside the original application, with focused evidence in `0006-qa/2026-10-13-comparison-build/README.md`. The original application is unchanged.

## Branding and copy ownership

Use supplied Logo1.png without a newly invented cross/logo, distortion or decorative rotation. Full navigation starts at 1200px; below that use a clear menu and retain a short Book action. Do not change the source booking field requirements in a visual study. Intended customer words come from 14-page-by-page-review-and-wording.md; preview limitations and engineering notes belong in the private review interface.

## State contract

| State | Presentation / behavior |
| --- | --- |
| Hover, focus, active | Teal emphasis; 700 button label; clear outline; active press scale .99 only with normal motion. |
| Selected | Visible border/background plus `aria-current`, `aria-pressed` or checked native input as appropriate. |
| Disabled | No lift; clear unavailable text; never use a disabled state to disguise a missing provider. |
| Loading | Reserved media/layout dimensions; text explains what is loading; submit has one in-flight request and cannot duplicate an action. |
| Error | Inline plain reason, preserved entered data, linked field message; retry only when safe. No success fallback. |
| Empty | Explain no results/availability and offer an honest next action. No invented slots, names or reviews. |
| Media missing | Keep the frame; use a neutral care illustration/initials with accurate alt text; do not substitute an unrelated person. |
| Overlay open | Native dialog or equivalent: labelled title, Escape, focus contained, focus return; scroll lock restores prior state. |
| No JavaScript | Basic content and real links remain available; no opacity-hidden essential text. The study provides an explanatory no-script message for view switching. |

## Responsive and verification targets

Phone ≤767px; tablet 768–1023px; desktop ≥1024px. Review at 390×844, 768×1024, 1440×900 and 1920×1080; also inspect 320px width, 200% zoom and reduced motion. Avoid equal-height constraints on long translated copy. Keyboard and touch must reach every action. Use a horizontal control scroller only for compact service selectors, with a visible overflow cue; content itself must reflow.
