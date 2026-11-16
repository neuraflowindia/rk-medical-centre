// Meet the doctors: compare and choose. Three sections, each its own composition.
//   1 opening   a double portrait: the two doctors at work, the page's heading between them      light
//   2 who       a split spread: one sheet, two pages, "See Dr. Sanjay for" / "See Dr. Parul for"   tint
//   3 training  one sentence on where they trained, and four framed certificates, two each       light
//   then the shared closing. No reviews, no clinic photographs and no essentials strip here.
import {doctorsPage as words,workPortrait,avatarOf,meetCertificates} from '../../../clinic/page-content/doctors.mjs';
import {attrs,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {bookButton,callButton,tag,textLink} from '../../parts/button/button.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {photoFigure} from '../../parts/photo-figure/photo-figure.mjs';
import {certificateWall} from '../../parts/certificate-frame/certificate-frame.mjs';
import {closing} from '../../parts/closing/closing.mjs';

/** One doctor of the double portrait: a far plate that carries the slow light, the arch portrait, and the caption beside it. */
function sitter(item){
 return `<div${attrs({class:`page-doctors__sitter page-doctors__sitter--${item.id}`,'data-doctor':item.id})}>`
  +`<div class="page-doctors__frame"><span class="page-doctors__plate" aria-hidden="true"><span class="page-doctors__shaft"></span></span>`
  +photoFigure(workPortrait(item.id),{ratio:'4:5',frame:'arch',sizes:'(min-width: 1024px) 300px, (min-width: 768px) 240px, 44vw',loading:'eager',enter:false})
  +`</div>`
  +`<p class="page-doctors__caption"><strong>${text(item.name)}</strong><span>${text(item.role)}</span><em>${text(item.credit)}</em></p></div>`;
}

function opening(){
 return `<section class="page-doctors page-doctors__opening" aria-labelledby="doctors-title"><div class="wrap page-doctors__stage" data-ambient>`
  +`<div class="page-doctors__centre">`
  +sectionHead({runningHead:words.runningHead,heading:words.heading,emphasis:words.emphasis,level:1,id:'doctors-title'})
  +`<p class="page-doctors__jump">${textLink({label:words.jump.label,href:words.jump.href,icon:'down'})}</p></div>`
  +`<div class="page-doctors__pair">${words.portraits.map(sitter).join('')}</div>`
  +`</div></section>`;
}

/** One page of the spread: who this doctor is for, as a plain list, then the formal facts and the actions. */
function leaf(item,ctx){
 const face=avatarOf(item.id);
 return `<article${attrs({class:`page-doctors__leaf page-doctors__leaf--${item.tone}`,'data-doctor':item.id,'aria-labelledby':`see-${item.id}`})}>`
  +`<header class="page-doctors__leaf-head">${image(face,{className:'page-doctors__face'})}`
  +`<p class="page-doctors__leaf-role">${text(item.role)}</p><h3 class="page-doctors__leaf-title" id="see-${item.id}">${text(item.heading)}</h3></header>`
  +`<ul class="page-doctors__concerns">${item.concerns.map(concern=>`<li>${icon('check')}<span>${text(concern)}</span></li>`).join('')}</ul>`
  +`<div class="page-doctors__facts"><p class="page-doctors__formal">${text(item.formalLine)}</p><p class="page-doctors__registration">${text(item.registration)}</p>`
  +(item.tag?tag({label:item.tag,icon:'medal',tone:'gold'}):'')+`</div>`
  +`<div class="page-doctors__actions">${bookButton(ctx,{doctor:item.id})}${callButton(ctx,{doctor:item.id,lead:true})}`
  +textLink({label:item.profile.label,href:item.profile.href,className:'page-doctors__profile',attributes:{'aria-label':item.profile.spoken}})+`</div>`
  +`</article>`;
}

function choose(ctx){
 const section=words.choose;
 return `<section class="page-doctors page-doctors__choose" id="${section.id}" aria-labelledby="${section.id}-title"><div class="wrap">`
  +sectionHead({runningHead:section.runningHead,heading:section.heading,id:`${section.id}-title`})
  +`<div class="page-doctors__spread" data-enter="card">${section.leaves.map(item=>leaf(item,ctx)).join('')}</div>`
  +`<p class="page-doctors__more"><span>${text(section.more.lead)}</span> ${textLink({label:section.more.label,href:section.more.href})}</p>`
  +`</div></section>`;
}

function training(){
 const section=words.training;
 return `<section class="page-doctors page-doctors__training" id="${section.id}" aria-labelledby="${section.id}-title"><div class="page-doctors__training-grid">`
  +`<div class="wrap page-doctors__training-head">`
  +sectionHead({runningHead:section.runningHead,heading:section.heading,emphasis:section.emphasis,intro:section.intro,id:`${section.id}-title`})+`</div>`
  +`<div class="page-doctors__wall">${certificateWall(meetCertificates(),{label:section.wallLabel,view:true})}</div>`
  +`<p class="wrap page-doctors__wall-links"><span>${text(section.linksLead)}</span>`
  +section.links.map(link=>textLink({label:link.label,href:link.href,attributes:{'aria-label':link.spoken}})).join('')+`</p>`
  +`</div></section>`;
}

export function doctors(ctx){
 return opening()+choose(ctx)+training()+closing(ctx);
}
