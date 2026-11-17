// "Find your booking": the same short head as the booking page (its link leads back to booking)
// and the place where the runtime mounts the package's own lookup screen (`#clinic-booking-root`,
// contract 2.6).
import {bookingDetailsPage as words} from '../../../clinic/page-content/booking.mjs';
import {bookingHead} from '../booking/booking.mjs';

export function bookingDetails(ctx){
 return `<section class="page-booking page-booking-details">${bookingHead(words)}`
  +`<div class="wrap"><div id="clinic-booking-root" class="page-booking__root page-booking-details__root"></div></div></section>`;
}
