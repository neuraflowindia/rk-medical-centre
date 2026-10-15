# R. K. Medical Centre

The completed clinic website and contained standardized appointment system. Source imported from the approved correction candidate on 15 October 2026; earlier review versions are preserved separately.

## Local website

Use Node.js with npm. Run `npm ci`, then `npm run dev`. Run `npm run build` to compile the local frontend. The site includes eight main pages, local artwork, multi-stage motion, doctor facts and the preserved original reviews.

## Vercel configuration

Framework: Vite. Application root: repository root. Install: `npm ci`. Build: `npm run build:hosting`. Output: `dist`. The root `vercel.json` and `middleware.ts` connect the contained Python backend and signed booking-state routing. Do not replace these with a generic all-path Home rewrite.

## Production setup status

This initial upload retains the verified local test installation profile. The hosting build deliberately refuses it until the clinic-owned database, worker, sender and production identity are configured. Creating or linking the repository does not activate booking. The intended public address is `https://www.rkmedicalcentre.com`; the owner purchased the domain through Hostinger.

Use `appointment-system/docs/contained-setup.md` and `appointment-system/docs/resource-visits.md` for supported configuration. Private credentials belong in protected provider settings, never source or chat. Follow the exact installation schema and keep all purpose-specific connections separate.

## Confirmed booking behavior

Two independently scheduled doctors; Rs.800 each; in-clinic appointments; phone required and email optional; online or at-clinic payment when that method is ready. Show starting times only and retain private 20-minute capacity. Sunday evening is closed. Patients contact the clinic for changes/cancellation; authorized staff decide with reasons and preserved history. Cancellation does not automatically refund money.

The initial checkout has no live provider credentials or customer records. Contact-message delivery and optional visitor measurement remain unavailable until connected to approved destinations.
