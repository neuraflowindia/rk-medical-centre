// Home: seven sections, each its own composition, in the order of clinic/page-content/home.mjs.
// (Skeleton: the sections' structure with the shared parts in place; the finished page follows.)
import {hero,doctorsSection,credentials,credentialsHeading,homeCertificates,reviewsSection,visitingSection,questionsSection} from '../../../clinic/page-content/home.mjs';
import {attrs,emphasise,text} from '../../lib/html.mjs';
import {bookingEntry,callButton} from '../../parts/button/button.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {essentialsStrip} from '../../parts/essentials-strip/essentials-strip.mjs';
import {doctorCard} from '../../parts/doctor-card/doctor-card.mjs';
import {reviewShelf} from '../../parts/review-shelf/review-shelf.mjs';
import {certificateWall} from '../../parts/certificate-frame/certificate-frame.mjs';
import {questions} from '../../parts/questions/questions.mjs';
import {closing} from '../../parts/closing/closing.mjs';

export function home(ctx){
 return `<section class="page-home page-home__hero" aria-labelledby="hero-title"><div class="wrap">`
  +`<h1 id="hero-title">${emphasise(`${hero.heading.plain} ${hero.heading.emphasis}`,hero.heading.emphasis)}</h1>`
  +`<p class="page-home__lead">${text(hero.lead)}</p>`
  +`<div class="page-home__actions" data-bar-lead>${bookingEntry(ctx,{place:'page',hook:'data-home-appointment-entry'})}${callButton(ctx,{label:hero.call})}</div>`
  +`</div><div class="wrap">${essentialsStrip(ctx)}</div></section>`
  +`<section class="page-home page-home__doctors" id="doctors" aria-labelledby="doctors-title"><div class="wrap">`
  +sectionHead({runningHead:doctorsSection.runningHead,heading:doctorsSection.heading,emphasis:'One family practice.',intro:doctorsSection.intro,id:'doctors-title'})
  +`<div class="page-home__doctor-grid">${doctorsSection.cards.map(card=>doctorCard(card,ctx)).join('')}</div></div></section>`
  +`<section class="page-home page-home__credentials" id="credentials" aria-labelledby="credentials-title"><div class="wrap">`
  +sectionHead({runningHead:credentials.runningHead,heading:credentialsHeading(ctx.now.getFullYear()),id:'credentials-title'})
  +`<dl class="page-home__ledger">${credentials.rows.map(row=>`<div><dt>${text(row.title)}</dt><dd>${row.detail?text(row.detail):''}</dd></div>`).join('')}</dl>`
  +certificateWall(homeCertificates(),{settle:true})+`</div></section>`
  +`<section class="page-home page-home__reviews" id="reviews" aria-labelledby="reviews-title"><div class="wrap">`
  +sectionHead({runningHead:reviewsSection.runningHead,heading:reviewsSection.heading,emphasis:'words.',id:'reviews-title'})+`</div>`
  +reviewShelf(ctx,{filter:'all',limit:8,featured:true})+`</section>`
  +`<section class="page-home page-home__visiting" id="visiting" aria-labelledby="visiting-title"><div class="wrap">`
  +sectionHead({runningHead:visitingSection.runningHead,heading:visitingSection.heading,emphasis:'Indira Nagar.',id:'visiting-title'})
  +`<address${attrs({class:'page-home__address'})}>${text(visitingSection.card.address)}</address></div></section>`
  +`<section class="page-home page-home__questions" id="questions" aria-labelledby="questions-title"><div class="wrap">`
  +sectionHead({runningHead:questionsSection.runningHead,heading:questionsSection.heading,emphasis:'come.',id:'questions-title'})
  +questions(questionsSection.rows,{name:'home-questions'})+`</div></section>`
  +closing(ctx);
}
