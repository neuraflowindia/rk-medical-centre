// The page around the booking screens: a short sage head with the page's one <h1>, and the place
// where the runtime mounts the lazily loaded steps (`#clinic-booking-root`, contract 2.6). While
// the steps cannot be shown, the same place holds one panel with the clinic's numbers.
import {doctors} from '../../../clinic/model.mjs';
import {doctorOrder} from '../../../clinic/care-catalogue.mjs';
import {clinicObjects} from '../../../clinic/client-media.mjs';
import {bookingPage as words,bookingUnavailableWords} from '../../../clinic/page-content/booking.mjs';
import {callRows} from '../../../clinic/page-content/shared.mjs';
import {attrs,emphasise,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {callRow,doctorAvatar} from '../../parts/action-bar/action-bar.mjs';
import {textLink} from '../../parts/button/button.mjs';

/**
 * The head every booking screen shares: sage ground, the page's one heading and one quiet link to
 * the other booking screen (an ordinary booking link: it exists only while booking is ON).
 */
export function bookingHead({heading,emphasis,link}){
 return `<div class="page-booking__head"><div class="wrap page-booking__head-row"><h1 class="page-booking__title">${emphasise(heading,emphasis)}</h1>`
  +textLink({label:link.label,href:link.path,className:'page-booking__link',attributes:{'aria-label':link.spoken}})+`</div></div>`;
}

export function booking(ctx){
 return `<section class="page-booking">${bookingHead(words)}`
  +`<div class="wrap"><div id="clinic-booking-root" class="page-booking__root"></div></div></section>`;
}

const PANEL_ICONS=Object.freeze({checking:'clock',unavailable:'info',error:'alert'});
/** The four things the panel can say. */
export const PANEL_STATES=Object.freeze(['opening','checking','unavailable','error']);
/**
 * What `#clinic-booking-root` shows while the booking screens cannot be used.
 *   state   'opening' (loading the screens) · 'checking' · 'unavailable' · 'error'
 *   doctor  the doctor already chosen, if any: only that doctor's number is then shown
 *   kept    true when booking stopped in the middle of the steps: says the typed details are kept
 */
export function bookingUnavailable({state='unavailable',doctor='',kept=false}={}){
 if(!PANEL_STATES.includes(state))throw new RangeError('Unknown booking panel state: '+state);
 if(state==='opening'){
  return `<div class="page-booking__panel page-booking__panel--opening"><p class="page-booking__opening" role="status">${text(bookingUnavailableWords.opening)}</p>`
   +`<span class="page-booking__ghost" aria-hidden="true"></span><span class="page-booking__ghost" aria-hidden="true"></span><span class="page-booking__ghost" aria-hidden="true"></span></div>`;
 }
 const rows=callRows().filter(row=>!Object.hasOwn(doctors,doctor)||row.id===doctor);
 return `<div class="page-booking__panel" data-booking-unavailable data-state="${state}">`
  +image(clinicObjects['telephone-handset'],{className:'page-booking__object'})
  +`<span class="page-booking__mark" aria-hidden="true">${icon(PANEL_ICONS[state])}</span>`
  +`<h2 class="page-booking__status" role="status">${text(bookingUnavailableWords[state])}</h2><p class="page-booking__help">${text(bookingUnavailableWords.help)}</p>`
  +(kept?`<p class="page-booking__kept">${text(bookingUnavailableWords.kept)}</p>`:'')
  +`<ul class="call-rows page-booking__calls" data-clinic-contacts>${rows.map(row=>`<li>${callRow(row,{avatar:doctorAvatar(row.id)})}</li>`).join('')}</ul>`
  +`<button${attrs({class:'button button--second page-booking__retry',type:'button','data-booking-retry':true})}><span class="button__label">${text(bookingUnavailableWords.retry)}</span></button></div>`;
}

/** The doctors in booking order, for the page's own use. */
export const bookingDoctors=doctorOrder;
