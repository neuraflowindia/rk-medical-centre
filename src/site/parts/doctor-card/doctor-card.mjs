// The Home doctor card: the portrait breaking the card's top edge, name, plain specialty, the
// formal line with degrees, the concern chips with a fixed-height answer directly under them, one
// paper-cut object that changes with the chip, and the two actions.
import {clinicObjects} from '../../../clinic/client-media.mjs';
import {doctorsSection} from '../../../clinic/page-content/home.mjs';
import {attrs,classes,image,text} from '../../lib/html.mjs';
import {bookButton,callButton,chip,tag,textLink} from '../button/button.mjs';
import {archPortrait} from '../photo-figure/photo-figure.mjs';

/**
 * `card` is one entry of `doctorsSection.cards` in clinic/page-content/home.mjs.
 *   order  the card's place in its row, for the entrance (0, 1, …)
 * The first chip is chosen; with scripts off each chip is a link to its place on Treatments.
 */
export function doctorCard(card,ctx,{order=0}={}){
 const id=card.id,first=card.chips[0];
 const chips=card.chips.map((item,index)=>chip({label:item.label,href:item.href,chosen:index===0,attributes:{'data-chip-id':item.id,'data-book-href':item.bookHref}})).join('');
 const answers=card.chips.map((item,index)=>
  `<div${attrs({class:'doctor-card__answer','data-answer':item.id,'data-active':index===0})}><p>${text(item.answer)}</p>${textLink({label:item.more.label,href:item.more.href})}</div>`).join('');
 const objects=card.chips.map((item,index)=>image(clinicObjects[item.object],{attributes:{'data-object':item.id,'data-active':index===0}})).join('');
 // A card beside another starts its entrance a little later than its neighbour.
 return `<article${attrs({class:classes('doctor-card',`doctor-card--${card.tone}`),'aria-labelledby':`doctor-${id}-name`,'data-doctor-card':id,'data-enter':'card','data-enter-after':order>0?String(Math.round(order*12)/100):null})}>`
  +`<div class="doctor-card__top"><figure class="doctor-card__portrait"><span class="doctor-card__plate" aria-hidden="true"></span>`
  +archPortrait(card.photo,{sizes:'(min-width: 768px) 176px, 120px',alt:card.name})
  +`<figcaption>${text(card.photoCaption)}</figcaption></figure>`
  +`<div class="doctor-card__id"><h3 class="doctor-card__name" id="doctor-${id}-name">${text(card.name)}</h3>`
  +`<p class="doctor-card__role">${text(card.specialty)}</p>`
  +`<p class="doctor-card__formal"><span class="wide-only">${text(card.formal)} · </span>${text(card.degrees)}</p>`
  +(card.tag?tag({label:card.tag,icon:'medal',tone:'gold'}):'')
  +textLink({label:card.profile.label,href:card.profile.href,className:'doctor-card__profile doctor-card__profile--narrow'})+`</div></div>`
  +`<div class="doctor-card__chips"><p class="doctor-card__prompt" id="doctor-${id}-prompt">${text(doctorsSection.chipPrompt)}</p>`
  +`<div class="chip-row" aria-labelledby="doctor-${id}-prompt" data-chip-row>${chips}</div></div>`
  +`<div class="doctor-card__answers" data-answers>${answers}</div>`
  // the object floats; a card beside another keeps a different beat, so the two never move as one
  +`<div${attrs({class:'doctor-card__objects','aria-hidden':'true','data-ambient':'float',style:order>0?`--float-phase:${-2.6*order}s`:null})}>${objects}</div>`
  +`<p class="visually-hidden" aria-live="polite" data-chip-live></p>`
  // "Full profile" sits in the name block on phones and beside the buttons on laptops; only one of the two is ever shown.
  +`<div class="doctor-card__actions">${bookButton(ctx,{doctor:id,topic:first.topic,attributes:{'data-card-book':true}})}${callButton(ctx,{doctor:id,lead:true})}`
  +textLink({label:card.profile.label,href:card.profile.href,className:'doctor-card__profile doctor-card__profile--wide'})+`</div>`
  +`</article>`;
}
