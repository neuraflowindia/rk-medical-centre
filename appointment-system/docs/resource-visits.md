# Independent resources and clinic visits

## Scope and compatibility

Business policy version2 adds generic resources. The engine contains no clinic-name or doctor-name branch. Version1 policy, online payment, historical receipts and migration001–037 retain their contracts. Migration038 is additive except that the capacity exclusion now compares the resource as well as the reserved time. Existing rows receive the `default` resource and `online` payment method.

Package/database/worker contract numbers remain1. Capability negotiation is explicit: version2 checkout requires a supported `payment_method`; omitted or null legacy writes are rejected before booking. Old settings readers reject version2. Old single-resource closure writes are refused under version2. Resource allocation always comes from the server's accepted service mapping, never a caller-supplied resource override.

## Accepted business facts

Version2 replaces top-level `weekly_windows` with `resources:[{id,name,weekly_windows}]`. Each service has `resource_id`. Each window has `weekday,start,end,start_grace_minutes,extra_starts`. Additional starts are explicit; occupied intervals still include the full internal duration and buffers. Overlapping alternative starts are not separately available capacity.

Version2 also requires `payment_methods`, `meeting`, `location` and `display_duration`. Location is exactly `{name,address,maps_url}` for `in_person`, otherwise null. A customer can see only the starting time when `display_duration:false`; internal expiry, calendar and capacity calculations still use exact end times. Payment at the clinic requires an in-person visit.

## Frozen bookings and receipts

The accepted resource, name, location, payment choice and duration-display rule are frozen with the booking. Changed business settings cannot rewrite an accepted visit. Bookings and claims have matching immutable resource identities. Settings changes cannot silently move existing capacity into another scheduling model.

Version2 public facts add exactly seven fields: `facts_version:2`, `resource_id`, `resource_name`, `payment_method`, `amount_due_paise`, `location`, `display_duration`. Version1 receipts omit them. Partial or contradictory version2 facts are rejected. Name-and-phone lookup stays read-only and keeps its existing version1 envelope, with the explicitly versioned inner facts.

At-clinic checkout atomically confirms the appointment and claims capacity. It creates no payment order, has no payment-hold expiry, and reports `order_state:not_required`, `payment_state:due_at_clinic`, zero captured/refunded money and the outstanding fee. Its `hold_expires_at` is null. Cancellation releases capacity and makes the amount due zero; it does not fabricate a refund. A failed worker wake leaves durable delivery work queued and must not invalidate the accepted booking.

Online checkout retains the supported payment provider flow and confirmation from independently observed captured payment. Neither an unpaid clinic booking nor an unverified browser callback can supply captured-payment evidence.

## Staff and notifications

Installation `resource_notifications` binds a resource to its notified inbox. The selected resource receives its own booking notification; the agency receives its existing management notification. Notification configuration is private installation data and grants no sign-in permissions.

Installation `schedule_management:['agency']` explicitly extends version2 schedule management to the agency. Existing client access remains. The actual signed-in role stays `agency`; the UI reads `can_manage_schedule` rather than pretending that the agency is the client. Schedule access covers calendar viewing, closure/reopening, appointment detail, cancellation/rescheduling and saved-operation reconciliation. It does not grant client contact correction, inbox/refund decisions, company control or provider connection consent. Both HTTP routes and database functions enforce this boundary.

Version2 time context returns `policy_version:2` and `resources:[{id,name}]`. The closure HTTP payload uses `resource_id`, with `*` requiring a deliberate all-resources selection. The new database closure operation preserves one idempotent all-resource result and reports `claim_ids` and `active`. A lost response can be reconciled without closing the time twice. Staff list filtering is over loaded rows, and counts explicitly remain all-resource counts until a server-side filtered contract exists.

## Staff-decided changes

Migration 039 accepts optional version 2 `appointment_changes:"staff_discretion"`. Absence or `legacy_notice` keeps the earlier notice-based behavior. Unknown values fail Python, SQL and browser validation. The mode is resolved from current trusted policy under the existing settings lock; it is not supplied by the action caller or inferred from a clinic name.

In staff-discretion mode, authorized staff can cancel or move any confirmed appointment, including one whose start has passed. A reason is required. There is no 12-hour restriction, one-late-move allowance or original-date +14-day deadline. A move still needs a future available start for the same doctor, within the configured notice/horizon and working windows. The accepted fee, payment choice, duration, location and doctor remain fixed. A retired doctor's past appointment can be cancelled, but moving it returns `resource_unavailable` until its schedule is valid again.

Each action appends effective policy mode/version, before/after state, time bounds and revision alongside actor, reason and operation identity. Old audit rows retain absent new details rather than invented history. Duplicate operations return their saved result; changed retries, stale revisions, invalid identities and occupied targets remain refused. Past changes never restore cancelled/expired bookings or revoked receipt access. Earlier late flags/deadlines remain history but do not block this mode.

Cancellation does not issue a refund. Authorized payment-account users decide and carry out any refund through the provider dashboard; reconciliation preserves actual payment evidence. Agency scheduling permission gains no financial or contact-correction power. At-clinic bookings retain zero online captured/refunded money. Updated notices use the saved revision and new time, while prior delivery evidence remains intact.

Customer guidance is only “For cancellations or changes, contact the clinic.” Installation `public_contacts` is an optional array of 1–10 exact `{label,phone}` entries: labels are unique, printable strings of 1–100 characters; phone is E.164 (`+` and 7–15 digits). This is public clinic contact data, not patient data or notification authority. V2 customer emails include these contacts. Receiving sites pass the same array as optional `contacts` to both `createReceiptFields` and `createBookingDetailsFields` (and direct PDF helpers); no clinic number is hardcoded in the package.

## Independent payment readiness

The v2 `/api/booking-policy` envelope includes `payment_availability`, with exactly the configured methods as keys. Each value is `{available:boolean,reason:null|"temporarily_unavailable"}`; available entries require null reason and unavailable entries require the stated reason. V1 envelopes are unchanged. This uncached live projection stays outside policy hashing and saved fees.

Clinic payment requires open supported booking admission and schedule browsing. Online payment additionally requires the active declared merchant/version, matching payment credentials, matching webhook registry and usable provider-ingress store. No provider probe runs on page render. The same resolver supplies the transactional expected merchant for new v2 checkout; unavailable online intake is rejected before commitment. SQL rechecks identity/readiness and recovers an already committed request before new-intake checks. Existing payment/receipt/reconciliation paths retain their pinned credentials.

The browser rejects missing/malformed v2 availability. An explicitly selected method is retained when it becomes unavailable; it is never silently switched to clinic payment. New choice/checkout is blocked for that method, details stay in memory, and definite uncommitted payment failures refresh the live policy. Ambiguous attempts keep their exact saved identity and recovery path.

## Recovery and installation

Backups must accept simultaneous appointments for different resources and legitimate unpaid confirmations. Independent restore checks also reject resource mismatches and clinic bookings with online payment records. Historical conversion inventories include resource closure actions.

Install the whole sealed package using `tools.install.package`; never copy selected engine files. Keep immutable project settings and protected provider configuration in the receiving installation. Real account setup, signed host display routing, production activation and hosted acceptance remain explicit deployment work. A private fixture browser is test evidence only and cannot become the customer booking path.
