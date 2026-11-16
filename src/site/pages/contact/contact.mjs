// Contact — SKELETON. The page builder replaces what is inside; the exported names and the
// page's root class (.page-contact) stay. A page prints exactly one <h1> and no <main> of its own.
// The page is its own closing: it ends with the footer.
import {contactPage as words} from '../../../clinic/page-content/contact.mjs';
import {bookingPaths} from '../../../clinic/page-content/shared.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {textLink} from '../../parts/button/button.mjs';
import {messageForm} from './message-form.mjs';

export function contact(ctx){
 return `<section class="page-contact page-contact__opening" data-bar-lead><div class="wrap">`
  +sectionHead({runningHead:words.runningHead,heading:words.heading,emphasis:words.emphasis,level:1})
  +`</div></section>`
  +`<section class="page-contact page-contact__message"><div class="wrap">${messageForm(ctx)}`
  +`<p class="page-contact__find">${textLink({label:words.findBooking,href:bookingPaths.find})}</p></div></section>`;
}
