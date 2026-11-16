// "Find your booking": the page around the booking-details screen — SKELETON. The booking
// builder replaces what is inside; the exported names and `#clinic-booking-root` stay (contract 2.6).
import {bookingDetailsPage as words} from '../../../clinic/page-content/booking.mjs';
import {text} from '../../lib/html.mjs';

export function bookingDetails(ctx){
 return `<section class="page-booking-details"><div class="wrap"><h1 class="page-booking-details__title">${text(words.heading)}</h1>`
  +`<div id="clinic-booking-root" class="page-booking-details__root"></div></div></section>`;
}
