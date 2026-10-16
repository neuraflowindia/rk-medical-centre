# Source, visual and publication review

Owner scope: two bounded refinements, documentation alignment and publication. Baseline b0f98ae; implementation 1b1936e; final documentation closeout a77f772. Work and return branches preserve the exact preceding website. No earlier custom/reference source was deleted or overwritten.

## Deterministic findings and implementation

The actual official overview had five physician rows and three women's rows. At 1440px its column heights were 527.265625px and 364.390625px. The missing header action was present in markup but hidden/inert by the shared OFF booking binding; it was not a missing button component.

The treatment overview adds two entry points into existing care: period concerns/PCOS → women's-health; care after childbirth → pregnancy. Both already occur in the catalogue/doctor text. Five rows per side, stretching group wrappers and flexible lists create equal desktop/tablet height. Phone lists use natural rows. The eight underlying topics, detail/preparation content, doctor mappings, URL selection, loading/cancellation logic and choreography remain unchanged.

The shared header now has equal flexible sides around desktop navigation, brand left and appointment action right. Phone/tablet keep the menu. The existing visibility owner updates only this header action before its normal booking-link pass. Disabled/unavailable/unknown display goes to the real Contact phone choices; enabled display goes to the existing booking route. A foreground check retaining an enabled view keeps that route under the shared display contract, while admission remains blocked until fresh. Other booking-only links, forms and hosting OFF routes remain guarded. No second controller, request, timer or provider activation was introduced.

The owner was asked an optional OFF destination preference. With no reply, the recommended Contact behavior was explicitly stated as an implementation assumption after a reasonable opportunity to respond. Silence is not recorded as an answer or fresh approval. The visible-header implementation/publication itself was explicitly authorized. No code promotes a simulated booking service.

## Review and corrections

Source review covers the complete five-file frontend diff and README, including both shared visibility subscribers, their ordering, the child-list observer, stale booking-only attributes, active page state and phone layout. Header markup does not start with an unusable OFF booking URL. The helper uses the existing enabled display state and does not weaken admission or submission. All original fields, content, artwork and motion remain.

Rendered review covers 1440, 1200, 1024, 768, 390 and 320px widths. Columns match at every two-column breakpoint reviewed; at 1440px both are 527.265625px. Phone cards retain five entries and flow naturally. No horizontal overflow was observed. The header was inspected on all eight main app views at 1440/390, including the existing guarded unavailable Booking view. Native reduced movement, active navigation, hover, keyboard focus and the phone menu were inspected.

Review improved phone row sizing and reduced the compact action/menu focus offset to 3px so the outlines stay separate. Both new links open Dr. Parul Gupta's correct existing detail. Natural topic assembly reaches its settled state and retains its distinct loops. The menu closes after its existing 180ms exit and returns focus; an earlier immediate capture sampled that transition before closing and was revisited after settlement. A loose text capture selector matched both pregnancy and after-childbirth text; an exact title selector corrected that capture. Neither required a product logic change.

The local preview process stopped with exit 143 during capture. It was restarted; final review continued. Local compiled previews do not host the Python service-state backend, so they are not real booking/provider proof. No synthetic state was substituted.

The documentation pass corrected an imprecise checking-state description: the existing shared controller can retain an enabled display during foreground refresh. It also labels private provider/setup results as the last recorded guided-launch evidence, rather than pretending they were re-read in this visual release. All five documentation hubs distinguish ten overview links from eight real topics, current versus preserved comparisons, final versus implementation commit, and website publication versus unfinished provider/client content acceptance. Historical receipts remain historical.

## Official output and limits

The official-domain review observed all seven public routes at 200 on computer/phone, visible header actions and correct selected navigation. Both desktop overview columns are 527.265625px, each with five rows; the two actual care groups still contain eight topic choices. The header action opens Contact with both genuine doctor call destinations. The live service-state read returns 200 and enabled=false; direct `/booking` remains 404 under the unchanged OFF guard. No page errors were observed in this readback. Exact source/provider status, assets and capture count are recorded in `publication.json`.

No tests, lint, type/syntax checks, coverage jobs, release gates or workflow dispatch ran. Normal hosting compilation succeeded. No form was submitted, booking/payment/email/message created, provider activated, database changed, shared package edited or other client touched. The ON route branch was source-reviewed against the existing contract; live booking acceptance remains unfinished separately. Current client status/README/brief/build notes and app README are aligned, with preceding text preserved in `documentation-before/`.
