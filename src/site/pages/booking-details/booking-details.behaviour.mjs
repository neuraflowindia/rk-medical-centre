// "Find your booking": the page's own behaviour. The runtime mounts the screen inside
// `#clinic-booking-root`. Everything added here must stop when `signal` aborts; the file must
// import cleanly outside a browser.
export function bindBookingDetails(root,{signal,ctx,services}={}){}
