# Private calendars for in-person visits

The optional calendar copy is part of the clinic release candidate, not the neutral online-consultation package. Migration 040 is additive. The package, database and worker contract numbers stay 1. Migrations 001–039 remain byte-for-byte unchanged. A complete sealed release must be installed; individual file copying into a live client is unsupported.

## Identity, privacy and authority

Installation `resource_calendars` maps an existing version 2 in-person resource ID to the exact already approved `resource_notifications` email for that resource. Owners must be different for different calendars. A map cannot remove or change an existing owner: outstanding snapshots and cleanup jobs must retain their original destination. A future owner change requires a separately planned migration, not editing a business setting.

Each resource uses the existing encrypted Google resource connection named `calendar_<resource-id>` and a calendar-only grant role `doctor-<resource-id>`. Request only OpenID, email and `calendar.events.owned`. Client and agency sign-in principals remain unchanged. A doctor grant never supplies staff or company sign-in, Drive access or another doctor's calendar. Existing staff logins cannot refresh doctor resource grants. Company controls can initiate normal consent while booking is OFF, the exact account owner approves at Google, and the original company session explicitly finishes installation. Unsupported delegated owner-repair links remain closed for doctor roles; they are not treated as proof of an existing paid video obligation.

The booking database remains authoritative for capacity and appointments. Remote events are private copies on the declared owner's primary calendar. The event contains a booking reference, internal start/end and installation/booking/revision/resource identity. No patient name, email, phone, medical notes, attendee, invitation or conference/Meet field is sent. The exact internal end time does not appear in patient copy. Ordinary clinic acknowledgment emails still use the separate approved notification path.

## Delivery and correction

Confirmed insertion, confirmation after online capture, or a changed confirmed revision enqueues the existing `booking_calendar` calendar lane. A trigger captures the old revision before moves or cancellation and enqueues `booking_cancelled` with that immutable snapshot. Optional-map absence keeps the older in-person behavior, including ordinary records copies. Adding a map backfills confirmed mapped visits without changing their booking/payment history.

The adapter uses official Events GET/POST/DELETE only. Its URL is confined to the exact declared owner and deterministic revision event ID. It reads before creating, reconciles a conflict or later retry at the same ID, validates owner, times, private properties and absence of conferencing/attendees, and never overwrites a conflicting remote event. A lost write reply remains retryable; it is not evidence that the event was never created. Cancellation reads the event and deletes with its ETag. A precondition conflict requires attention. Remote absence is a successful repeated cleanup.

The existing job lease, request budget, release/restore binding and transport journal remain in charge. A late create after a cancellation requeues cleanup even when an earlier cleanup already completed. Stale or replaced leases cannot finish. In-person completion creates no `meeting_events` row, Meet-readiness wait, video-details email or meeting-ready spreadsheet job. Existing online-consultation behavior is unchanged. Staff-discretion mode continues to allow past-appointment corrections with a reason and preserved history.

## Supported closed cutover

Prepare and verify the complete new app, worker, private settings and public assets before changing the live map. Keep new booking intake OFF and confirm the current requested state is also OFF. Preserve all existing rows, grants, keys and release artifacts. Verify the doctor identities and callback URLs against the receiving installation; another client's grant or database is never a valid substitute.

Use the existing protected owner connection and `tools.setup.configure_resource_calendars(connection, installation, expected_profile=..., expected_worker=..., new_worker=...)`. `installation` is the fully validated intended project document including the map. The expected values are the exact previously read installation document digest and current worker release digest; `new_worker` is the final sealed, prepared worker content digest. This is an owner setup operation, not an HTTP route or customer/staff action.

The operation uses one transaction, in this order:

1. The existing owner helper acquires exclusive restore lock `(83124,5)` and then control/worker lock `(83124,4)`, checks the declared database and owner login, and sets short lock/statement limits.
2. Lock installation, product-state and worker-release rows. Verify the expected old installation and old worker digest, unchanged identity outside the optional map, and both OFF flags.
3. Refuse an active worker or any live delivery, verification, provider, payment, Google refresh/workbook or publication lease. Wait for existing supported work to finish or reconcile; never erase or force-reset leases to pass this check.
4. Bind the final new worker digest through the existing `configure_worker_release` operation, then call owner-only `configure_resource_calendars` to append the map and seed durable jobs. Existing map values and grants remain preserved.
5. Verify the returned profile digest and exact final installation document. Commit the worker binding, map and backfilled jobs together. Any failure rolls back all three. No network/provider request runs inside this transaction.

This order fences the old binary before any new calendar work becomes visible. An old worker must never see a new in-person calendar job while still authorized to create video meetings. After commit, install/deploy only the prepared matching app/worker and private profile, verify their exact release/installation identities, configure the two Google resource entries, and collect the two normal owner consents while intake remains OFF. Resume only matching worker code. Verify a controlled in-person visit for each doctor, its acknowledgment destination and private event, then a move/cancellation, without any real payment. Reopen booking only after the agreed hosted acceptance and current-state publication checks pass.

A current owner command always outranks a captured earlier desired state. The cutover does not turn booking ON. If another owner action changes OFF state or either expected identity, the operation refuses rather than overwriting it.

## Rollback and actual account dependencies

Before map commit, use the preserved compatible release and unchanged profile. After commit, roll forward or use a reader that understands the map and outstanding private calendar jobs. Never erase grants, queued jobs or booking history to make an older binary start. Close intake and retain a compatible cleanup worker if a hosted/provider problem is found. A wrong remote identity is attention work, not permission to delete or overwrite another event.

Local synthetic proof does not establish real Google approval, production callback configuration, OAuth publishing status, sustained offline refresh, actual delivery, or hosting acceptance. Those are separate receiving-installation checks. No real payment, email, account mutation or provider call was performed by this implementation task.
