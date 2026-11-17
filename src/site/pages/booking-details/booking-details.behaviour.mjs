// "Find your booking": the page's own behaviour. The runtime mounts the screen inside
// `#clinic-booking-root`. While that screen cannot be used the same panel is shown as on the
// booking page, so its floating object is followed the same way. Everything added here stops
// when `signal` aborts; the file imports cleanly outside a browser.
import {bindBooking} from '../booking/booking.behaviour.mjs';

export function bindBookingDetails(root,context={}){bindBooking(root,context);}
