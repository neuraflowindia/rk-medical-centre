// Contact: reach us, find us. Four sections, each its own composition, on alternating grounds.
//   1 first screen: the directory card (numerals you can tap)      light
//   2 find us: a drawn map with a picture pinned to it             tint
//   3 hours: the one full timetable on the site                    light
//   4 the message form (a letter), then the full privacy notice    tint
// The page is its own closing: after it comes the footer.
import {clinicObjects} from '../../../clinic/client-media.mjs';
import {contactPage as words,findUs,hours,hoursHeading,messageForm as formWords,privacyNotice,weekRows} from '../../../clinic/page-content/contact.mjs';
import {bookingPaths,callRows} from '../../../clinic/page-content/shared.mjs';
import {attrs,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {bookButton,button,textLink} from '../../parts/button/button.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {openSign} from '../../parts/open-sign/open-sign.mjs';
import {callRow,doctorAvatar,whatsappRow} from '../../parts/action-bar/action-bar.mjs';
import {photoFigure} from '../../parts/photo-figure/photo-figure.mjs';
import {hoursTable} from '../../parts/hours-table/hours-table.mjs';
import {messageForm} from './message-form.mjs';

// ---------- 1 · first screen ----------
function openingPart(ctx){
 // Each row leads with the need, as the call sheet does: a visitor chooses by what is wrong, not by a name.
 const rows=callRows().map(row=>`<li>${callRow(row,{needFirst:true,roomy:true,avatar:doctorAvatar(row.id)})}</li>`).join('');
 return `<section class="page-contact page-contact__opening" aria-labelledby="contact-title" data-bar-lead><div class="wrap page-contact__opening-grid">`
  +`<div class="page-contact__opening-copy">`
  +sectionHead({runningHead:words.runningHead,heading:words.heading,emphasis:words.emphasis,level:1,id:'contact-title'})
  +openSign(ctx,{form:'closing',className:'page-contact__sign'})
  +`</div>`
  // far: the arch and its slow light · subject: the paper card · near: the handset
  +`<div class="page-contact__stage"><div class="page-contact__arch" aria-hidden="true"><span class="page-contact__light" data-ambient><span class="page-contact__shaft"></span></span></div>`
  +`<div class="page-contact__directory">${image(clinicObjects['telephone-handset'],{className:'page-contact__handset',eager:true,attributes:{fetchpriority:null}})}`
  +`<ul class="call-rows page-contact__rows" aria-label="${text(words.directoryLabel)}">${rows}<li>${whatsappRow(ctx,{roomy:true})}</li></ul>`
  +`<p class="page-contact__changes">${icon('info')}<span>${text(words.changes)}</span></p></div></div>`
  // Booking ON: the main button and the way back to a booking. OFF: both leave, and one line says to call.
  +`<div class="page-contact__actions">${bookButton(ctx,{size:'large',label:words.book,className:'page-contact__book'})}`
  +textLink({label:words.findBooking,href:bookingPaths.find,className:'page-contact__find-booking'})
  +`<p class="page-contact__booking-off" data-booking-off-only>${icon('phone')}<span>${text(words.bookingOff)}</span></p></div>`
  +`</div></section>`;
}

// ---------- 2 · find us ----------
// The drawn locator. Its shapes follow public map data for the clinic's own map point: one unit is
// about one metre, north is up, and the pin's tip stands on the clinic's spot (342, 197).
const MAP=Object.freeze({
 view:'0 -30 680 430',
 ringRoad:'M-30 124 26 140 316 168 710 201',
 southRoad:'M316 178 304 320 278 440',
 northRoad:'M319 160 331 -45',
 lanes:'M8 320 304 350M155 380 159 335M69 216 64 268M369 289 373 243M579 355 470 345M13 263 19 211M179 227 166 336M246 287 257 189M296 404 252 396M252 396 261 368M583 318 512 310 518 255M588 262 574 409M173 279 311 294M465 398 613 413M424 295 304 283M115 331 131 170M420 348 363 343 359 386 416 391M121 273 13 263M479 252 465 398M247 345 227 404M668 363 680 216M63 326 61 357 41 393M61 357 90 373 173 382 180 372 238 377M416 391 433 196M15 211 252 234M373 243 626 265 613 413M211 -23 282 -16M282 -16 277 35M171 -17 69 -27 26 -38M329 40 74 16 41 9M171 -17 168 25M521 -33 634 -23M692 79 687 129M517 13 639 25M573 18 563 118M440 -23 460 -22 457 8M380 -29 417 -25 414 5M568 68 692 79M639 25 629 124M513 59 329 40M380 -29 374 45M481 10 485 -40M563 118 687 129M378 2 517 13M503 166 521 -33M374 45 364 148M74 16 64 127M190 27 187 138M621 320 671 323',
 parks:'M69 265 73 221 120 226 116 269ZM372 287 376 246 425 251 421 292ZM471 396 475 350 504 352 500 398ZM178 275 183 231 247 238 242 282ZM517 307 522 258 585 264 580 313ZM364 381 368 348 415 353 411 386ZM634 120 637 80 686 84 683 124ZM573 64 578 23 633 29 629 70Z'
});

function locator(){
 const map=findUs.locator;
 const art=`<svg class="page-contact__map-art" viewBox="${MAP.view}" role="img" aria-label="${text(map.spoken)}" focusable="false">`
  +`<path class="page-contact__map-park" d="${MAP.parks}"/>`
  +`<path class="page-contact__map-lane" d="${MAP.lanes}"/>`
  +`<path class="page-contact__map-edge page-contact__map-edge--side" d="${MAP.northRoad}"/><path class="page-contact__map-edge page-contact__map-edge--side" d="${MAP.southRoad}"/>`
  +`<path class="page-contact__map-edge" d="${MAP.ringRoad}"/>`
  +`<path class="page-contact__map-road page-contact__map-road--side" d="${MAP.northRoad}"/><path class="page-contact__map-road page-contact__map-road--side" d="${MAP.southRoad}"/>`
  +`<path class="page-contact__map-road" d="${MAP.ringRoad}"/><path class="page-contact__map-median" d="${MAP.ringRoad}"/>`
  +`</svg>`;
 const label=(kind,inner)=>`<span class="page-contact__map-label page-contact__map-label--${kind}" aria-hidden="true">${inner}</span>`;
 return `<figure class="page-contact__locator" data-locator data-enter="card"><div class="page-contact__map"><div class="page-contact__map-window">`
  +`<div class="page-contact__map-plane">${art}`
  +label('road',text(map.road))
  +label('west',`${icon('left')}${text(map.west)}`)
  +label('east',`${text(map.east)}${icon('right')}`)
  // The pin comes down onto the clinic's spot as the map is scrolled to; its shadow lands last.
  +`<span class="page-contact__pin" data-enter="drop" data-enter-after="0.35" aria-hidden="true"><span class="page-contact__pin-shadow"></span>`
  +`<span class="page-contact__pin-hop">${image(clinicObjects['map-pin'],{className:'page-contact__pin-art'})}</span></span>`
  +label('pin',text(map.pin))
  +`</div>`
  +label('north',`${icon('route')}${text(map.north)}`)
  // The whole drawing opens Google Maps; this second link is the same one, for the pointer only.
  +`<a${attrs({class:'page-contact__map-hit',href:map.href,target:'_blank',rel:'noopener',tabindex:'-1','aria-hidden':'true'})}></a>`
  +button({label:map.open,href:map.href,variant:'second',size:'compact',external:true,iconAfter:'out',note:map.opens,labelHidden:'narrow',className:'page-contact__map-open'})
  +`</div></div></figure>`;
}

function findPart(){
 const card=findUs.card,photo=findUs.photo;
 return `<section class="page-contact page-contact__find" id="find-us" aria-labelledby="find-title"><div class="wrap">`
  +sectionHead({runningHead:findUs.runningHead,heading:findUs.heading,emphasis:findUs.emphasis,id:'find-title'})
  +`<div class="page-contact__table">${locator()}`
  +photoFigure(photo.id,{ratio:photo.ratio,caption:photo.caption,sizes:'(min-width: 1024px) 520px, (min-width: 768px) 56vw, 84vw',className:'page-contact__frontage'})
  +`<div class="page-contact__address" data-enter="card"><h3>${text(card.name)}</h3><address>${text(card.address)}</address>`
  // Outline at every width: the view already holds a filled Book button (the header's, or the phone bar's).
  +button({label:card.directions.label,href:card.directions.href,variant:'second',external:true,iconAfter:'out',note:card.opens,className:'page-contact__directions'})
  +`<p class="page-contact__parking">${icon('car')}<span>${text(card.parking)}.</span></p></div>`
  +`</div></div></section>`;
}

// ---------- 3 · hours ----------
function hoursPart(ctx){
 const head=hoursHeading(),note=hours.note;
 return `<section class="page-contact page-contact__hours" id="hours" aria-labelledby="hours-title"><div class="wrap page-contact__hours-grid">`
  +`<div class="page-contact__hours-copy">`
  +sectionHead({runningHead:hours.runningHead,heading:head.heading,emphasis:head.emphasis,id:'hours-title'})
  +`<div class="page-contact__observation" data-enter>${icon('shield')}<div><h3>${text(note.title)}</h3><p>${text(note.text)}</p></div></div></div>`
  // The timetable is flat (it is information); the calendar on its pale arch is the one accent.
  +`<span class="page-contact__hours-arch" aria-hidden="true"></span>`+image(clinicObjects['desk-calendar'],{className:'page-contact__calendar'})
  +`<div class="page-contact__ledger" data-enter>${hoursTable(ctx,{rows:weekRows(),caption:hours.caption,roomy:true,className:'page-contact__week'})}</div>`
  +`</div></section>`;
}

// ---------- 4 · the message form and the privacy notice ----------
function noticeSection(section){
 const lists=(section.lists||[]).map(list=>`<p class="page-contact__notice-lead">${text(list.lead)}</p><ul>${list.items.map(item=>`<li>${text(item)}</li>`).join('')}</ul>`).join('');
 return `<div class="page-contact__notice-part"><h3>${text(section.heading)}</h3>${lists}${(section.paragraphs||[]).map(words=>`<p>${text(words)}</p>`).join('')}</div>`;
}

/** The full privacy notice: one raised row that opens in place (it works without scripts). */
function privacyPart(){
 const full=privacyNotice.full;
 return `<details class="page-contact__notice" id="${full.id}" data-privacy-notice>`
  +`<summary class="page-contact__notice-open"><span class="page-contact__notice-words"><h2 class="page-contact__notice-title">${text(full.open)}</h2>`
  +`<span class="page-contact__notice-note">${text(full.openNote)}</span></span>`
  +`<span class="page-contact__notice-mark" aria-hidden="true">${icon('plus',{className:'page-contact__notice-plus'})}${icon('minus',{className:'page-contact__notice-minus'})}</span></summary>`
  +`<div class="page-contact__notice-body"><p class="page-contact__notice-date">${text(full.updated)}</p>${full.sections.map(noticeSection).join('')}</div></details>`;
}

function messagePart(ctx){
 return `<section class="page-contact page-contact__message" id="message" aria-labelledby="message-title"><div class="wrap">`
  +`<div class="page-contact__message-grid"><div class="page-contact__message-copy">`
  +sectionHead({runningHead:formWords.runningHead,heading:formWords.heading,emphasis:formWords.emphasis,id:'message-title'})
  +`<p class="page-contact__urgent" data-enter>${icon('phone')}<span>${text(formWords.urgent)}</span></p></div>`
  +messageForm(ctx)
  +image(clinicObjects.pen,{className:'page-contact__pen'})
  +`</div>${privacyPart()}</div></section>`;
}

export function contact(ctx){
 return openingPart(ctx)+findPart()+hoursPart(ctx)+messagePart(ctx);
}
