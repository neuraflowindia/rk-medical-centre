// The page around the booking screens — SKELETON. The booking builder replaces what is inside;
// the exported names, `#clinic-booking-root` and the panel's three hooks stay (contract 2.6).
// The booking steps themselves are a separate, lazily loaded piece mounted by the runtime.
import {doctors} from '../../../clinic/model.mjs';
import {doctorOrder} from '../../../clinic/care-catalogue.mjs';
import {bookingPage as words,bookingUnavailableWords} from '../../../clinic/page-content/booking.mjs';
import {callRows} from '../../../clinic/page-content/shared.mjs';
import {text} from '../../lib/html.mjs';
import {callRow} from '../../parts/action-bar/action-bar.mjs';

export function booking(ctx){
 return `<section class="page-booking"><div class="wrap"><h1 class="page-booking__title">${text(words.heading)}</h1>`
  +`<p class="page-booking__intro">${text(words.intro)}</p><div id="clinic-booking-root" class="page-booking__root"></div></div></section>`;
}

/**
 * What `#clinic-booking-root` shows while the booking screens cannot be used.
 *   state   'opening' (loading the screens) · 'checking' · 'unavailable' · 'error'
 *   doctor  the doctor already chosen, if any: only that doctor's number is then shown
 */
export function bookingUnavailable({state='unavailable',doctor=''}={}){
 if(!Object.hasOwn(bookingUnavailableWords,state))throw new RangeError('Unknown booking panel state: '+state);
 if(state==='opening')return `<p class="page-booking__opening" role="status">${text(bookingUnavailableWords.opening)}</p>`;
 const rows=callRows().filter(row=>!Object.hasOwn(doctors,doctor)||row.id===doctor);
 return `<div class="page-booking__unavailable" data-booking-unavailable data-state="${state}">`
  +`<h2 role="status">${text(bookingUnavailableWords[state])}</h2><p>${text(bookingUnavailableWords.help)}</p>`
  +`<ul class="call-rows" data-clinic-contacts>${rows.map(row=>`<li>${callRow(row)}</li>`).join('')}</ul>`
  +`<button class="text-link" type="button" data-booking-retry>${text(bookingUnavailableWords.retry)}</button></div>`;
}

/** The doctors in booking order, for the page's own use. */
export const bookingDoctors=doctorOrder;
