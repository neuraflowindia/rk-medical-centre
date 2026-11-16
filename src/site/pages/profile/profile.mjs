// A doctor's profile: one template for both doctors — SKELETON. The page builder replaces what is
// inside; the exported names and the page's root class (.page-profile) stay. A page prints
// exactly one <h1> and no <main> of its own.
import {profilePage} from '../../../clinic/page-content/doctors.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {closing} from '../../parts/closing/closing.mjs';

/** `id` is "sanjay" or "parul". */
export function profile(ctx,id){
 const words=profilePage(id);
 return `<section class="page-profile page-profile__opening" data-doctor="${id}"><div class="wrap">`
  +sectionHead({runningHead:words.runningHead,heading:words.heading,intro:words.role,level:1})
  +`</div></section>`
  +closing(ctx,{doctor:id});
}
