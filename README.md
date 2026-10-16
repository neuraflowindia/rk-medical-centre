# R. K. Medical Centre

The published clinic website and contained standardized appointment system. Source imported from the approved correction candidate on 15 October 2026; earlier review versions are preserved separately. Client content approval and the remaining provider connections are separate unfinished items.

## Local website

Use Node.js with npm. Run `npm ci`, then `npm run dev`. Run `npm run build` to compile the local frontend. The site includes eight main pages, local artwork, multi-stage motion, doctor facts and the preserved original reviews.

## Home refinement

The Home page keeps the established hero, distinct mint treatment section, six consistent paper-style care images, fuller stacked doctor profiles, calendar dates and repeating three-step explanation. The doctors now have six clearly filled qualification/institution/experience pills, two specialty strips, two practice-since-1992 badges and nine icon-led care links. The shared footer includes labelled doctor phone numbers, confirmed appointment times, directions and privacy choices.

Two additional sections retain the full reference-inspired treatments: an instrument/clipboard consultation banner and four independently illustrated benefits/preparation cards. The banner uses three responsive WebP sizes. The four vector illustrations assemble in separate stages and have small visible-only inner accent loops. Booking ON explains the supported online flow; OFF shows practical visit preparation and real Contact/Doctors/Treatments actions. Both sections remain visible OFF. No digital-prescription, zero-wait or patient self-cancellation capability is introduced.

Patient feedback uses 18 existing author/quotation pairs from the unchanged 26-review source collection. It moves automatically at 20px/second on computers and 14px/second on phones, pauses on hover and resumes after leaving. Read all reveals a complete still list; native reduced motion also uses that list. Every review now has an explicit visit label and meaningful icon, stronger author/quote treatment, first-entry accents and an independent inner hover surface. No invented ratings, localities, verification labels or patient-photo associations are in the public application.

A fully populated private Home comparison uses these same components, styles and motion, with all 18 portrait/rating/location/verification placements. It is kept outside this repository, binds only to localhost, blocks product navigation/submissions and identifies its unconfirmed examples in the outer review shell. The owner uses complete realistic examples to judge the finished design; the client then supplies, corrects and approves actual information and photographs before the website is called finished. Design completion, publication and content approval are recorded separately.

Home doctor/review/booking-benefit components have their own small modules and styles. Per-card clocks wait until their own artwork is reached; resizing preserves Home movement rather than finishing unseen scenes. The two new Home scenes extend the existing catalogue from 32 to 34; all previous scene timings and eight treatment sequences are retained. The contained booking engine, actual fees, schedules, payment rules and OFF controls are unchanged. The existing visit form remains governed by booking availability; no second capture flow or unconnected enquiry form is published.

The owner requested implementation, source/visual review and publication without tests. No automated test, lint, type or release suite was run for this Home refinement. Normal frontend/hosting compilation is separate from testing.

## Vercel configuration

Framework: Vite. Application root: repository root. Install: `npm ci`. Build: `npm run build:hosting`. Output: `dist`. The root `vercel.json` and `middleware.ts` connect the contained Python backend and signed booking-state routing. Do not replace these with a generic all-path Home rewrite. The root `requirements.txt` is an exact generated copy of the sealed package requirements because Vercel's Python manifest discovery cannot follow its nested `-r` file reference. The hosting build refuses any mismatch. `/tests` in `.vercelignore` excludes only a top-level website test folder; every sealed package file remains included for its runtime integrity check.

## Production setup status

The public website is published at `https://www.rkmedicalcentre.com`, with the root domain redirecting to www. All seven public routes respond, desktop/phone views render, and private management sign-in/status/sign-out passed against the actual hosted backend. Online booking remains OFF while its remaining real connections are completed. No patient booking, payment or real email was created during setup.

The separate Neon database has all 39 verified migrations and seven limited-purpose logins. The contained Cloudflare worker has all eight private keys, two SQLite state classes and its owned queue. The official initializer's signed OFF acknowledgement and fresh read match the database. Its 15-minute recovery schedule and exact queue consumer are attached after backend acceptance. The independent health observer uses the contained GitHub workflow, a main-only environment and only its separate monitor key; its current run result is recorded in the clinic's deployment evidence.

The owner reports saving 20 instructed website values. Actual runtime composition accepts the core database/protection settings, but currently rejects the email connection; the protected value cannot be inspected through the existing hosting access. Email delivery callbacks, Google staff/records access, the payment merchant, independent encrypted recovery and private owner credential handoff remain unfinished. Contact-message delivery and optional visitor measurement have no approved destination and remain unavailable. These setup limits do not prevent the ordinary website from loading.

Private setup values are encrypted outside this checkout. The official database installer, sealed package and hosting profile guard remain intact. Earlier website/design copies are preserved. The launch record distinguishes local builds, actual hosted checks and remaining provider acceptance; a published website does not establish operational booking readiness.

For the standalone OFF initializer, put both `appointment-system` and `appointment-system/engine` on the operator process's Python module path, matching `api/index.py`. Supply the maintenance connection and three control keys through the protected process environment and reuse the saved operation UUID after an interrupted reply. Never add the maintenance/reconcile credentials to website settings or alter the sealed package to bypass a setup refusal.

Use `appointment-system/docs/contained-setup.md` and `appointment-system/docs/resource-visits.md` for supported configuration. Private credentials belong in protected provider settings, never source or chat. Follow the exact installation schema and keep all purpose-specific connections separate.

## Confirmed booking behavior

Two independently scheduled doctors; Rs.800 each; in-clinic appointments; phone required and email optional; online or at-clinic payment when that method is ready. Show starting times only and retain private 20-minute capacity. Sunday evening is closed. Patients contact the clinic for changes/cancellation; authorized staff decide with reasons and preserved history. Cancellation does not automatically refund money.

No private credentials are stored in this checkout. Privileged migration, backup and maintenance connections never belong in its normal hosting settings. Contact-message delivery and optional visitor measurement remain unavailable until connected to approved destinations.
