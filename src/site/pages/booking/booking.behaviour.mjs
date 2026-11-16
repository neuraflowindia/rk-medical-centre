// The booking page's own behaviour. The runtime mounts the booking screens inside
// `#clinic-booking-root` (runtime/booking-island.mjs); this file is for the page around them.
// Everything added here must stop when `signal` aborts; the file must import cleanly outside a browser.
export function bindBooking(root,{signal,ctx,services}={}){}
