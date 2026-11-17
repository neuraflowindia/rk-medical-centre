// Home: seven sections, each its own composition, on alternating grounds so every boundary shows.
//   1 hero (a portrait pair with depth) + the essentials strip   light
//   2 the doctors (twin cards)                                    tint
//   3 credentials (asymmetric ledger with documents)              deep
//   4 reviews (a still shelf led by one pull-quote)               light
//   5 visiting us (a layered postcard)                            tint
//   6 questions (quiet accordion)                                 light
//   7 closing (one decision)                                      light, inset tint panel
import {clinicObjects,clinicPhotos} from '../../../clinic/client-media.mjs';
import {hero,doctorsSection,credentials,yearsNumeral,homeCertificates,reviewsSection,visitingSection,questionsSection} from '../../../clinic/page-content/home.mjs';
import {clinicName,essentials} from '../../../clinic/page-content/shared.mjs';
import {attrs,emphasise,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {bookingEntry,button,callButton} from '../../parts/button/button.mjs';
import {sectionHead,runningHead} from '../../parts/section-head/section-head.mjs';
import {essentialsStrip} from '../../parts/essentials-strip/essentials-strip.mjs';
import {archPortrait,photoFigure} from '../../parts/photo-figure/photo-figure.mjs';
import {doctorCard} from '../../parts/doctor-card/doctor-card.mjs';
import {reviewShelf} from '../../parts/review-shelf/review-shelf.mjs';
import {certificateWall} from '../../parts/certificate-frame/certificate-frame.mjs';
import {questions} from '../../parts/questions/questions.mjs';
import {hoursTable} from '../../parts/hours-table/hours-table.mjs';
import {closing} from '../../parts/closing/closing.mjs';

function heroSection(ctx){
 const portrait=item=>`<figure class="page-home__portrait page-home__portrait--${item.id}">`
  +archPortrait(item.photo,{sizes:'(min-width: 1024px) 264px, (min-width: 480px) 207px, 45vw',eager:true})
  +`<figcaption><strong>${text(item.name)}</strong><span>${text(item.role)}</span></figcaption></figure>`;
 return `<section class="page-home page-home__hero" aria-labelledby="hero-title"><div class="wrap page-home__hero-grid">`
  +`<div class="page-home__hero-copy"><h1 id="hero-title">${emphasise(`${hero.heading.plain} ${hero.heading.emphasis}`,hero.heading.emphasis,{keep:hero.heading.keep})}</h1>`
  +`<p class="page-home__lead">${text(hero.lead)}</p>`
  +`<div class="page-home__hero-actions" data-bar-lead>${bookingEntry(ctx,{place:'page',hook:'data-home-appointment-entry'})}${callButton(ctx,{label:hero.call})}</div></div>`
  +`<div class="page-home__stage"><div class="page-home__arch" aria-hidden="true" data-ambient><span class="page-home__shaft"></span></div>`
  +`<div class="page-home__pair">${hero.portraits.map(portrait).join('')}`
  // the stethoscope floats: with the light it is the first screen's second mover on laptops
  +image(clinicObjects[hero.object],{className:'page-home__hero-object',attributes:{'data-ambient':'float'}})+`</div>`
  +`<p class="page-home__credit">${text(hero.credit)}</p></div></div>`
  +`<div class="wrap page-home__strip">${essentialsStrip(ctx)}</div></section>`;
}

function doctorsPart(ctx){
 return `<section class="page-home page-home__doctors" id="doctors" aria-labelledby="doctors-title"><div class="wrap">`
  +sectionHead({runningHead:doctorsSection.runningHead,heading:doctorsSection.heading,emphasis:doctorsSection.emphasis,intro:doctorsSection.intro,id:'doctors-title'})
  +`<div class="page-home__doctor-grid">${doctorsSection.cards.map((card,index)=>doctorCard(card,ctx,{order:index})).join('')}</div></div></section>`;
}

function credentialsPart(ctx){
 const numeral=yearsNumeral(ctx.now.getFullYear()),digits=numeral.replace(/\+$/u,'');
 const rows=credentials.rows.map(row=>`<div class="page-home__ledger-row" data-enter="rule"><dt>${text(row.category)}</dt>`
  +`<dd>${row.icon?icon(row.icon,{className:'page-home__ledger-icon'}):''}<span>${text(row.title)}${row.detail?` <span class="page-home__ledger-who">${text(row.detail)}</span>`:''}</span></dd></div>`).join('');
 return `<section class="page-home page-home__credentials" id="credentials" aria-labelledby="credentials-title">`
  +`<div class="page-home__credentials-light" aria-hidden="true" data-ambient><span class="page-home__shaft page-home__shaft--deep"></span></div>`
  +`<div class="wrap page-home__credentials-grid"><div class="page-home__figure">`
  +runningHead(credentials.runningHead,{className:'page-home__credentials-running'})
  // The numeral counts up once as it arrives. What is read out is the number itself, said once;
  // the counting digits are for the eye only and keep the width of the final number.
  +`<h2 class="page-home__figure-title" id="credentials-title" data-enter><span class="page-home__numeral"><span class="visually-hidden">${text(numeral)}</span>`
  +`<span class="page-home__numeral-digits" aria-hidden="true" data-enter="count" style="--digits:${digits.length}">${text(digits)}</span><span class="page-home__numeral-plus" aria-hidden="true">+</span></span> `
  +`<span class="page-home__figure-words">${emphasise(credentials.numeralCaption,credentials.numeralEmphasis)}</span></h2></div>`
  +`<dl class="page-home__ledger">${rows}</dl></div>`
  +`<div class="page-home__certificates"><div class="wrap page-home__certificates-wrap">${certificateWall(homeCertificates(),{label:credentials.certificatesLabel,settle:true,view:true,set:'all'})}`
  // It opens the viewer, so it is drawn as the quiet button that opens a dialog (as "Read all reviews" is), not as a link to a page.
  +`<p class="page-home__certificates-more">${button({label:credentials.allCertificates.label,href:credentials.allCertificates.href,variant:'second',attributes:{'data-open-certificates':''}})}</p></div></div></section>`;
}

function reviewsPart(ctx){
 return `<section class="page-home page-home__reviews" id="reviews" aria-labelledby="reviews-title">`
  +reviewShelf(ctx,{filter:'all',featured:true,
   head:sectionHead({runningHead:reviewsSection.runningHead,heading:reviewsSection.heading,emphasis:reviewsSection.emphasis,id:'reviews-title'})})
  +`</section>`;
}

function visitingPart(ctx){
 const [frontage,waiting]=visitingSection.photos,card=visitingSection.card;
 return `<section class="page-home page-home__visiting" id="visiting" aria-labelledby="visiting-title"><div class="wrap page-home__visiting-grid">`
  +sectionHead({runningHead:visitingSection.runningHead,heading:visitingSection.heading,emphasis:visitingSection.emphasis,id:'visiting-title',className:'page-home__visiting-head'})
  +photoFigure(frontage.photo,{ratio:frontage.ratio,caption:frontage.caption,captionKey:frontage.key,sizes:'(min-width: 1024px) 694px, 92vw',className:'page-home__frontage'})
  +photoFigure(waiting.photo,{ratio:waiting.ratio,caption:waiting.caption,captionKey:waiting.key,sizes:'(min-width: 1024px) 300px, (min-width: 768px) 31vw, 40vw',className:'page-home__waiting'})
  +`<div class="page-home__address" data-enter="card">${image(clinicObjects[visitingSection.object],{className:'page-home__address-pin',attributes:{'data-ambient':'float'}})}`
  +`<h3>${text(clinicName)}</h3><address>${card.addressLines.map((line,index,all)=>{const words=text(line+(index<all.length-1?', ':''));return index?`<span class="page-home__address-line">${words}</span>`:words;}).join('')}</address>${hoursTable(ctx,{className:'page-home__hours'})}`
  // Outline at every width: the view already holds a filled Book button (the header's, or the phone bar's).
  +button({label:card.directions.label,href:card.directions.href,variant:'second',external:true,iconAfter:'out',note:essentials.place.opens,className:'page-home__directions'})
  +`<ul class="page-home__notes"><li>${icon('car')}<span>${text(card.parking)}.</span></li><li>${icon('file')}<span>${text(card.bring)}</span></li></ul></div>`
  +`</div></section>`;
}

function questionsPart(){
 const [list,pen]=questionsSection.objects;
 return `<section class="page-home page-home__questions" id="questions" aria-labelledby="questions-title"><div class="wrap page-home__questions-grid">`
  +`<div class="page-home__questions-head">`
  +sectionHead({runningHead:questionsSection.runningHead,heading:questionsSection.heading,emphasis:questionsSection.emphasis,id:'questions-title'})
  +`<div class="page-home__still-life" aria-hidden="true">${image(clinicObjects[list],{className:'page-home__still-list'})}${image(clinicObjects[pen],{className:'page-home__still-pen',attributes:{'data-ambient':'float'}})}</div></div>`
  +questions(questionsSection.rows,{name:'home-questions'})+`</div></section>`;
}

export function home(ctx){
 return heroSection(ctx)+doctorsPart(ctx)+credentialsPart(ctx)+reviewsPart(ctx)+visitingPart(ctx)+questionsPart(ctx)+closing(ctx);
}

/** The photographs Home shows, for tests and for anything that must know them. */
export const homePhotographs=Object.freeze([...hero.portraits.map(item=>item.photo),...visitingSection.photos.map(item=>item.photo)].map(id=>clinicPhotos[id].id));
