// The one list: address → page. Each entry names the page's template (`render`), its behaviour
// (`bind`) and how the shell around it looks. Adding a page means adding it here and nowhere else;
// the seven public addresses and the two booking screens are fixed by the installation.
import {home} from '../pages/home/home.mjs';
import {bindHome} from '../pages/home/home.behaviour.mjs';
import {treatments} from '../pages/treatments/treatments.mjs';
import {bindTreatments} from '../pages/treatments/treatments.behaviour.mjs';
import {about} from '../pages/about/about.mjs';
import {bindAbout} from '../pages/about/about.behaviour.mjs';
import {doctors} from '../pages/doctors/doctors.mjs';
import {bindDoctors} from '../pages/doctors/doctors.behaviour.mjs';
import {profile} from '../pages/profile/profile.mjs';
import {bindProfile} from '../pages/profile/profile.behaviour.mjs';
import {contact} from '../pages/contact/contact.mjs';
import {bindContact} from '../pages/contact/contact.behaviour.mjs';
import {booking} from '../pages/booking/booking.mjs';
import {bindBooking} from '../pages/booking/booking.behaviour.mjs';
import {bookingDetails} from '../pages/booking-details/booking-details.mjs';
import {bindBookingDetails} from '../pages/booking-details/booking-details.behaviour.mjs';

/**
 * `chrome`: 'full' = header with links, footer and the phone action bar; 'slim' = the booking
 * screens' quiet header and no action bar. `island`: which booking screen the runtime mounts
 * inside `#clinic-booking-root` ('booking' or 'details').
 */
export const pages=Object.freeze({
 '/':Object.freeze({id:'home',render:home,bind:bindHome,chrome:'full'}),
 '/treatment':Object.freeze({id:'treatments',render:treatments,bind:bindTreatments,chrome:'full'}),
 '/about-clinic':Object.freeze({id:'about',render:about,bind:bindAbout,chrome:'full'}),
 '/meet-doctor':Object.freeze({id:'doctors',render:doctors,bind:bindDoctors,chrome:'full'}),
 '/dr-sanjay-gupta':Object.freeze({id:'profile-sanjay',render:ctx=>profile(ctx,'sanjay'),bind:bindProfile,chrome:'full'}),
 '/dr-parul-gupta':Object.freeze({id:'profile-parul',render:ctx=>profile(ctx,'parul'),bind:bindProfile,chrome:'full'}),
 '/contact':Object.freeze({id:'contact',render:contact,bind:bindContact,chrome:'full'}),
 '/booking':Object.freeze({id:'booking',render:booking,bind:bindBooking,chrome:'slim',island:'booking'}),
 '/booking-details':Object.freeze({id:'booking-details',render:bookingDetails,bind:bindBookingDetails,chrome:'slim',island:'details'})
});

/** Every address the site can show. */
export const knownPaths=Object.freeze(Object.keys(pages));
/** The seven public pages: the ones that are printed at build time, in both booking states. */
export const publicPaths=Object.freeze(knownPaths.filter(path=>!pages[path].island));
/** The booking screens: drawn in the browser only. */
export const islandPaths=Object.freeze(knownPaths.filter(path=>pages[path].island));

/** The registry entry for an address; throws for an address the site does not have. */
export function pageFor(path){
 if(!Object.hasOwn(pages,path))throw new RangeError('Not a page of this site: '+path);
 return pages[path];
}
