// Meet the doctors — SKELETON. The page builder replaces what is inside; the exported names and the page's
// root class (.page-doctors) stay. A page prints exactly one <h1> and no <main> of its own.
import {doctorsPage as words} from '../../../clinic/page-content/doctors.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {closing} from '../../parts/closing/closing.mjs';

export function doctors(ctx){
 return `<section class="page-doctors page-doctors__opening"><div class="wrap">`
  +sectionHead({runningHead:words.runningHead,heading:words.heading,emphasis:words.emphasis,intro:words.intro,level:1})
  +`</div></section>`
  +closing(ctx);
}
