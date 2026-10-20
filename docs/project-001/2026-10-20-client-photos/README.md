# Supplied photographs — separate review branch

20 October 2026. This branch implements the owner's approved photograph placement plan. It is a local review candidate, not a new published release. The maintained/published baseline remains `cba2554c2540f12ad53b2111525caf409cb9ca9f` (18 October runtime plus subsequent documentation).

Work branch: `work/client-photos-20261020`. Return branch: `checkpoint/before-client-photos-20261020`. Keep previous custom versions and the original Doctor-Demo reference. Recover through a scoped revert or use the preserved baseline for comparison; do not reset shared history or delete earlier copies.

## What changes, and why

| Page | Addition |
| --- | --- |
| Home | Fill both existing doctor identity frames. Keep their emblems and movement beneath the photos, with a lighter tint against navy. Add one waiting-area preview after the doctor section. |
| About the clinic | Fill existing doctor frames; add one selected 4:3 photograph with five labelled choices after the doctors and before practical information. |
| Doctors | Fill existing identity frames while retaining the instrument artwork beneath them and every existing detail/action. |
| Both doctor profiles | Add a full 4:3 room photograph above the existing Related treatments content. Preserve each complex hero and the preparation, reviews and actions. |
| Contact | Add the street frontage and glass-door entrance after the existing opening/map section. Preserve phones, address, Map, hours and existing form state. |
| Treatments | Retain the existing page, without a repeated room-photo collection. |

Existing section wording, medical facts, reviews, calls, meaningful motion, guard ownership and all previous artwork stay. New photo sections are static, readable additions with hover/focus and enlarged viewing; they add no competing animation controller. Identity photos inherit existing container entry. No new clinical claim, customer journey, backend, library or provider setting is introduced.

## Source and ownership

- `src/clinic/client-media.mjs`: seven display entries and one ordered five-photo album. Doctor names come from the existing model; medical facts are not duplicated in media configuration.
- `src/clinic/clinic-photos.js/css`: semantic images/figures, responsive sources, captions, real opening buttons, Home preview, About collection and Contact arrival photos. The About link underlines only its words, with the arrow outside them.
- `src/clinic/doctor-photos.css`: populate the existing 4:5 identity spaces, retain initials as failure fallback and move the same Home emblem beneath the picture. Existing responsive grid dimensions are retained.
- `src/clinic/photo-viewer.js/css`: one native enlarged viewer, page-image loading/failure/retry, gallery selection and route-lifetime cleanup. No automatic slideshow.
- `site.js` binds the photo owner once per rendered route and leaves its images out of the inherited illustration failure treatment. Route abort disposes the viewer, listeners, observer and request timers.
- Existing H4/A3 factual tracks do not await new portraits; D1 still awaits its original instrument media only. S2/P2 fact/preparation tracks explicitly own no room-photo loading. Durations, tracks and loops remain; facts cannot be held invisible by a failed photograph.
- `public/client-photos/`: 26 WebP derivatives, 2,737,308 bytes in total across all responsive sizes. This is the entire library size, not a per-page download. The largest photograph is 338,926 bytes; the largest portrait is 48,132 bytes. No upscaling, generated face/room changes or copied original metadata.
- `appointment-settings/hosting-files.json`: includes all six new runtime files and all 26 derivative files. No existing source-export entry is removed. The contained booking package and settings remain unchanged.

[Media provenance](media-provenance.json) records original filenames/hashes, exact reviewed portrait crops and each output hash/dimension. Original intake belongs to the outer client project and remains byte-identical. Do not ship all incoming PNGs or use the duplicate entrance, gate/cart reserve or occupied reception merely to fill space. Named crops follow the supplied room context and the reviewed private board approved for implementation; independent public named-photo acceptance and the frontage's visible people/plates remain a later publication check. No face-recognition claim or patient-photo association is made.

## Interaction and failure rules

Every album entry opens the same five-photo order: waiting area, entrance, Sanjay's room, Parul's room and street frontage. The selected thumbnail retains focus and exposes its selected state. Both the picture and its View photo button work. Captions remain below pictures; no text sits over faces or signs.

The viewer reserves a 4:3 stage and contains the full photograph. It has caption/count, Previous/Next/Close, arrow keys, Escape/backdrop closing and explicit Tab edge wrapping. Focus returns to the original opener unless navigation removed it. Existing dialogs use the same scroll-lock/close-reason convention; no nested modal is kept open. Transitions are 150ms opacity only, removed under the device's reduced-motion preference.

Viewer requests use a fresh image and generation guard. A late prior photo cannot replace a later selection. The 15-second deadline shows a retry without blocking navigation. Lazy page-image deadlines start within 300px of the visible area. Ordinary photo failure retains its caption/actions and offers retry; portrait failure retains the exact frame and shows initials. Failed images never remove the page or its factual content. A retry affects only its image.

## Actual review and limits

The outer client delivery at `0006-qa/2026-10-20-client-photo-implementation/` contains the untouched current copy, this candidate, baseline fingerprints, private comparison server, screenshots and exact observations. The comparison uses actual compiled full pages at local ports 4251/4252, with a shell at 4245. The bridge is served only by the private tool; it is not in this production source or dist.

Review covers seven pages in both versions at 1440×1000 and 390×844 (28 renders), plus six changed pages at 1920, 1024, 768 and 320px (24 additional renders). Existing section copy and scene duration/track/loop counts match across all 14 current/candidate page-width pairs, excluding only the intentionally completed identity spaces and new photo captions. No existing visible section is removed. No document overflow, page-script exception, scene error or failed photo was observed in the normal render matrix.

Focused browser interactions cover all five selections, opening from page/caption controls, wraparound navigation, Tab/Shift+Tab, Escape/focus return, route cleanup, 320px controls, slow-image/Next races, failed portraits without motion delay, page and viewer retries, reduced motion and private enlarged-text stress. Review corrected the original faux caption action, native browser's extra BODY focus stop, focus transfer when Retry disappears, caption overflow under enlarged text and a clipped phone thumbnail focus outline. Early mid-transition viewer captures were replaced with settled captures after image readiness and the 150ms fade.

Full-page resting screenshots explicitly settle existing scenes and load/decode lazy images with bounded waits; they do not prove natural animation timing. Separate focused observations cover natural admission and failure independence. Private numeric text enlargement is not native browser-zoom certification. Desktop/phone responsive inspection is not physical-device or screen-reader acceptance.

Ordinary `npm run build:hosting` compilation succeeds. No application test suite, lint, coverage run, full local/hosted release gate, workflow dispatch, push or deployment occurs in this programme. Existing large booking/font chunk advisories remain. The read-only comparison intentionally has no API backend, so `/api/service-state` returns 404 and booking fails closed. That local response is not a new production defect or provider readiness test.

## Remaining decision

Review the current/updated pages with the owner. Publication is a separate step; do not infer a release from this branch approval. Existing booking, email, staff/records, recovery, merchant, Contact submission and measurement dependencies are unchanged and remain owned by the guided-launch documentation. This photo work does not submit a form, create an appointment, charge a patient, send a message or activate a provider.
