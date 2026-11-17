# R. K. Medical Centre

Official website:https://www.rkmedicalcentre.com/. This repository is the independent clinic application, built on the supplied Doctor-Demo reference. The original and all earlier approved comparison copies remain preserved.

Start with the [22 October current implementation and operating handoff](docs/project-001/2026-10-22-operating-search/README.md). It owns current implemented behavior, required provider connections, source/verification/publication distinctions and next actions. [Programme status](docs/project-001/2026-10-22-operating-search/programme-status.json) records the current release boundary. Older dated folders are historical proof for their own versions.

## Run and host

Use Node 22 and the declared pinned Python dependencies. Run `npm ci`, then `npm run dev` for the local website. `npm run build` compiles the frontend; `npm run build:hosting` validates production identity/dependencies, compiles the site and generates actual public/booking display documents. `npm run prepare:hosting` uses the contained reviewed source exporter; a build/export is not publication proof.

Vercel uses this repository root, install `npm ci`, build `npm run build:hosting`, output `dist`, Singapore region and the declared Python/API routes. Preserve `vercel.json`, `middleware.ts`, the generated requirements and the complete contained package. Do not add an all-path Home rewrite. Private configuration stays in the intended Production project, never in this repository.

## Ownership and preservation

The website was given a new look in November 2026. It has seven public pages (Home, Treatments, About the clinic, Meet the doctors, one page for each doctor, Contact) and the booking screens. The code is in two halves:

- `src/clinic/` holds the facts, the words and the logic: the clinic's details (`model.mjs`), what each doctor treats (`care-catalogue.mjs`), the ten certificates (`certificate-catalogue.mjs`), the 26 patient reviews (`content.mjs`, `review-list.mjs`), the list of pictures (`client-media.mjs`) and each page's words (`page-content/`). A fact is written once here and read from here.
- `src/site/` holds how the pages look and behave: the shared parts (`parts/`), one folder per page (`pages/`), the code that draws a page and moves between pages (`runtime/`), the styles (`styles/`, with every colour, size, shadow and timing named once in `tokens.css`), the movement (`motion/`), the icons and the two bundled typefaces.

The pictures are the clinic's own photographs, the doctors' certificates and the paper-cut objects, in the three folders under `public/`. Movement is quiet: parts settle into place as they are scrolled to, at most two things move by themselves in one view (one on a phone), and everything stops with "Pause motion" in the footer or the device's reduced-motion setting. Booking and the message form can each be on or off; every page is built for both states.

The earlier look (its page templates, its 21 stylesheets, its motion scenes and the 159 layered picture files only it used) was removed when the new one was finished. Nothing was lost: it is all in this repository's history. Keep the facts, reviews, certificates and photographs; change a fact in `src/clinic/`, never by typing it into a page. Before saving a change run `npm test` (the checks), `npm run build:hosting` (the build) and, after adding or removing any file, `npm run prepare:hosting` (which proves `appointment-settings/hosting-files.json` names every file the hosted site needs). The [20 October photo/certificate delivery](docs/project-001/2026-10-20-certificates/README.md) remains the factual record of where each photograph and certificate came from, not today's operating status.

The current installed booking package is 1.2.0-rc.2; verify its full seal before any change. Each doctor has separate capacity and a declared private calendar. Booking and Contact readiness are actual operational states, not visual settings. Keep them closed until the outstanding provider connections and real acceptance pass. See the current handoff and installed `docs/resource-visits.md`, `docs/private-resource-calendars.md`, `docs/contained-setup.md` and `docs/company-recovery.md`.

The source branch is `work/operating-search-efficiency-20261022`; original base 5d6e264 is preserved. Source commits, public deployment, matching worker/database binding and accepted real booking are separate outcomes. Never reset existing management credentials, copy another client's accounts, edit sealed package files or delete original assets/history to make status look complete.
