// "Find your booking": the same short head as the booking page, the place where the runtime
// mounts the package's own lookup screen (`#clinic-booking-root`, contract 2.6), and one quiet
// way back to booking (an ordinary booking link: it exists only while booking is ON).
import {bookingDetailsPage as words} from '../../../clinic/page-content/booking.mjs';
import {textLink} from '../../parts/button/button.mjs';
import {bookingHead} from '../booking/booking.mjs';

export function bookingDetails(ctx){
 return `<section class="page-booking page-booking-details">${bookingHead(words)}`
  +`<div class="wrap"><div id="clinic-booking-root" class="page-booking__root page-booking-details__root"></div>`
  +`<p class="page-booking-details__more">${textLink({label:words.bookNew.label,href:words.bookNew.path})}</p></div></section>`;
}
