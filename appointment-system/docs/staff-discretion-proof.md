# Staff-discretion and payment-readiness review

14 October 2026. This is isolated Project 001 candidate evidence, not a production release or a full release-suite result. No real patient, payment, provider message or production database was used.

## Changes checked

- Optional `appointment_changes: staff_discretion` in version 2; absent/legacy mode retains its previous rules.
- Past confirmed cancellations and moves with required reasons, current authorization, version checks and append-only before/after history.
- Preserved doctor, fee, payment records, original appointment evidence, late flags and revoked-access rules.
- Same-doctor future availability and occupied-time protection; a retired doctor can be cancelled but cannot be silently replaced.
- Per-method payment availability and the same new-intake predicate behind HTTP writes. Missing online prerequisites leave clinic payment independent.
- Contact-only customer instructions, public clinic phone declarations and PDFs containing the labelled numbers.
- Staff browser recognition of the new guidance, desktop/phone controls for past visits and explicit change reasons.

## Focused evidence

These groups overlap; their totals must not be added into an invented unique-test count.

| Area | Result |
|---|---|
| Existing resource/settings compatibility | 31 checks passed on isolated PostgreSQL 16 before final focused policy checks |
| New policy/resource cases | 10/10 passed on PostgreSQL 16 and 10/10 on PostgreSQL 18: nine policy/resource cases plus one real HTTP-to-SQL payment-readiness case |
| General HTTP/application/checkout boundaries | 27 checks passed |
| Browser coordinator compatibility | 30 checks passed |
| Clinic browser contract and unavailable-choice behavior | 11 checks passed |
| Receipt actions and retry behavior | 20 checks passed |
| Real PDF creation, decoded text and safe links | 8 checks passed; actual contained font and PDF library used, including lookup-PDF contact forwarding |
| Mail contracts and clinic facts | 24 checks passed |
| Staff HTTP permission/error boundaries | 10 checks passed |
| Actual staff page in Chromium | 8 checks passed; screenshots at 1440 and 390 pixels visually inspected |
| Historical migrations | All 38 files remain byte-identical to the preserved candidate |

The staff screenshots show a past confirmed appointment with both move/cancel forms, readable reasons and the private staff-discretion explanation. No horizontal overflow or JavaScript errors were detected. Public pages do not receive that internal explanation.

Focused statement coverage, with no exclusions: new payment-readiness module **26/26 (100%)**; settings module **302/304 (99.34%)**; mail-message module **82/89 (92.13%)**; staff appointment HTTP module **75/76 (98.68%)**. These are named module boundaries, not whole-package coverage claims.

## Corrections found during review

- Added the previously unclassified legacy `original_time_review_required` error and the new explicit `resource_unavailable` error.
- Rechecked staff authority after waiting for the final booking lock.
- Preserved the original action result after a subsequent policy change.
- Kept an unavailable selected payment choice visible in state and blocked submission, instead of silently switching to clinic payment.
- Refreshed policy after definite payment-readiness rejection while retaining typed customer details.
- Kept unpaid clinic staff guidance after a move rather than showing online-refund guidance.
- Threaded clinic contacts through the separate lookup-PDF owner as well as the receipt-PDF owner.
- Factored test setup to avoid running inherited compatibility cases repeatedly.

Two synthetic fixture mistakes were corrected without changing production protections: the HTTP request needed the supported optional-email request version, and a historical online booking needed a valid historical creation/hold timestamp as well as a past visit date. PostgreSQL correctly rejected the inconsistent original fixture. A local HTTP test process required normal local networking permissions; the same focused tests passed when run with that access.

## Remaining external work

Production host/account ownership, final domain, database, sender, Google sign-in, recovery worker, merchant/webhook verification, signed display activation and real-provider acceptance remain installation work. The candidate does not claim live bookings. It uses no other client's accounts. Follow the supported whole-package installer and scoped production setup; never copy individual engine files or reopen older booking writers.
