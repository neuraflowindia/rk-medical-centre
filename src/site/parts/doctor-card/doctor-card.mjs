// The Home doctor card: portrait, name, plain specialty, formal line, the concern chips with a
// fixed-height answer directly under them, and the two actions. (Skeleton: plain markup; the
// finished card arrives with the shared parts.)
import {doctorsSection} from '../../../clinic/page-content/home.mjs';
import {attrs,classes,text} from '../../lib/html.mjs';
import {bookButton,callButton,chip,tag,textLink} from '../button/button.mjs';

/** `card` is one entry of `doctorsSection.cards` in clinic/page-content/home.mjs. */
export function doctorCard(card,ctx){
 const chips=card.chips.map((item,index)=>chip({label:item.label,href:item.href,chosen:index===0,attributes:{'data-chip-id':item.id}})).join('');
 const answers=card.chips.map((item,index)=>
  `<div${attrs({class:'doctor-card__answer','data-answer':item.id,hidden:index!==0})}><p>${text(item.answer)}</p>${textLink({label:item.more.label,href:item.more.href})}</div>`).join('');
 return `<article${attrs({class:classes('doctor-card',`doctor-card--${card.tone}`),'aria-labelledby':`doctor-${card.id}-name`,'data-doctor-card':card.id,'data-enter':'card'})}>`
  +`<div class="doctor-card__top"><div class="doctor-card__id"><h3 class="doctor-card__name" id="doctor-${card.id}-name">${text(card.name)}</h3>`
  +`<p class="doctor-card__role">${text(card.specialty)}</p><p class="doctor-card__formal">${text(card.formalLine)}</p>`
  +(card.tag?tag({label:card.tag,icon:'medal',tone:'gold'}):'')
  +textLink({label:card.profile.label,href:card.profile.href,className:'doctor-card__profile'})+`</div></div>`
  +`<div class="doctor-card__chips"><p class="doctor-card__prompt" id="doctor-${card.id}-prompt">${text(doctorsSection.chipPrompt)}</p>`
  +`<div class="doctor-card__chip-row" aria-labelledby="doctor-${card.id}-prompt" data-chip-row>${chips}</div></div>`
  +`<div class="doctor-card__answers" data-answers>${answers}</div>`
  +`<div class="doctor-card__actions">${bookButton(ctx,{doctor:card.id})}${callButton(ctx,{doctor:card.id,lead:true})}</div>`
  +`</article>`;
}
