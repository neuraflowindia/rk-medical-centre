// A doctor's profile: one template for both doctors. Six sections, each its own composition.
//   1 cover         a cover portrait: the doctor's face, name, standing and the two actions      light
//   2 essentials    the shared strip, across the boundary (people land here straight from a search)
//   3 care          what the doctor sees patients for: raised rows into the Treatments page       tint
//   4 about         an editorial two-column: the room photograph beside 60 to 80 words            light
//   5 certificates  a gallery wall: five framed documents on a still shelf                        deep
//   6 reviews       the shared shelf, this doctor's patients only                                 light
//   then the shared closing with this doctor's own button and number.
import {clinicObjects} from '../../../clinic/client-media.mjs';
import {profilePage,workPortrait,roomPicture} from '../../../clinic/page-content/doctors.mjs';
import {attrs,classes,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {bookButton,button,tag,textLink} from '../../parts/button/button.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {photoFigure} from '../../parts/photo-figure/photo-figure.mjs';
import {essentialsStrip} from '../../parts/essentials-strip/essentials-strip.mjs';
import {certificateFrame} from '../../parts/certificate-frame/certificate-frame.mjs';
import {stillShelf} from '../../parts/still-shelf/still-shelf.mjs';
import {reviewShelf} from '../../parts/review-shelf/review-shelf.mjs';
import {closing} from '../../parts/closing/closing.mjs';

/** The line that says when the doctor can next be seen. Printed neutral; the behaviour paints the real answer. */
export function sessionLine(session){
 return `<p${attrs({class:'page-profile__session','data-next-session':true,'data-state':session.state,'data-nosnippet':true})}>${icon('clock')}`
  +`<span class="page-profile__session-words"><span class="page-profile__session-label" data-session-label>${text(session.label)}</span>`
  +`<span class="page-profile__session-sep" aria-hidden="true">: </span><strong class="page-profile__session-detail" data-session-detail>${text(session.detail)}</strong></span></p>`;
}

function cover(ctx,words){
 const id=words.id;
 // Call shows the digits in both booking states; while booking is OFF it is the main action and takes the filled look.
 const call=button({label:words.call.label,href:words.call.href,icon:'phone',variant:'second',className:'button--lead',spoken:words.call.spoken,attributes:{'data-open-call':id}});
 return `<section${attrs({class:`page-profile page-profile__cover page-profile--${words.tone}`,'data-doctor':id,'aria-labelledby':'profile-title'})}><div class="wrap page-profile__cover-grid">`
  +`<div class="${classes('page-profile__sitter',words.tag&&'page-profile__sitter--tagged')}">`
  +`<div class="page-profile__frame"><span class="page-profile__plate" aria-hidden="true" data-ambient><span class="page-profile__shaft"></span></span>`
  +photoFigure(workPortrait(id),{ratio:'4:5',frame:'arch',sizes:'(min-width: 1024px) 300px, 200px',loading:'eager',enter:false})
  +(words.tag?tag({label:words.tag,icon:'medal',tone:'gold',className:'page-profile__honour'}):'')+`</div>`
  +`<p class="page-profile__credit">${text(words.credit)}<span class="wide-only">, ${text(words.creditPlace)}</span></p></div>`
  +`<div class="page-profile__identity">`
  // The cover is centred on phones, so its running head is the page's own: the same caps with a hairline either side.
  +`<p class="page-profile__kicker"><span>${text(words.runningHead)}</span></p>`
  +`<h1 class="page-profile__name" id="profile-title">${text(words.heading)}</h1>`
  +`<p class="page-profile__role">${text(words.role)}</p>`
  +`<p class="page-profile__standing"><span>${text(words.degrees)}</span><span class="page-profile__registration">${text(words.registration)}</span></p>`
  +`<div class="page-profile__actions" data-bar-lead>${bookButton(ctx,{doctor:id})}${call}</div>`
  +sessionLine(words.session)
  +`</div></div>`
  +`<div class="wrap page-profile__strip">${essentialsStrip(ctx)}</div></section>`;
}

function care(words){
 const section=words.care;
 const row=(topic,index)=>`<li${attrs({'data-enter':'card',style:`--i:${index}`})}><a class="page-profile__topic" href="${text(topic.href)}">`
  +`<span class="page-profile__topic-name">${text(topic.label)}</span><span class="page-profile__topic-go" aria-hidden="true">${icon('arrow')}</span></a></li>`;
 return `<section${attrs({class:`page-profile page-profile__care page-profile--${words.tone}`,id:section.id,'aria-labelledby':`${section.id}-title`})}><div class="wrap page-profile__care-grid">`
  +`<div class="page-profile__care-head">`
  +sectionHead({runningHead:section.runningHead,heading:section.heading,emphasis:section.emphasis,id:`${section.id}-title`})
  +image(clinicObjects[section.object],{className:'page-profile__care-object'})+`</div>`
  +`<ul class="page-profile__topics" aria-label="${text(section.listLabel)}">${section.topics.map(row).join('')}</ul>`
  +`</div></section>`;
}

function about(words){
 const section=words.about,room=roomPicture(words.id);
 return `<section${attrs({class:`page-profile page-profile__about page-profile--${words.tone}`,id:section.id,'aria-labelledby':`${section.id}-title`})}><div class="wrap page-profile__about-grid">`
  +sectionHead({runningHead:section.runningHead,heading:section.heading,emphasis:section.emphasis,id:`${section.id}-title`,className:'page-profile__about-head'})
  +`<div class="page-profile__room"><span class="page-profile__room-plate" aria-hidden="true"></span>`
  +photoFigure(room,{ratio:'3:2',caption:section.caption,sizes:'(min-width: 768px) 420px, 92vw'})+`</div>`
  +`<div class="page-profile__story">`
  +`<p class="page-profile__lede" data-enter style="--i:2">${text(section.lede)}</p>`
  +`<p class="page-profile__body" data-enter style="--i:3">${text(section.body)}</p>`
  +`<p class="page-profile__bring" data-enter style="--i:4">${textLink({label:section.bring.label,href:section.bring.href})}</p>`
  +`</div></div></section>`;
}

function certificates(words){
 const section=words.certificates;
 const frames=section.items.map((item,index)=>`<div class="page-profile__hung" data-enter="card" style="--i:${index}">`
  +certificateFrame(item,{size:'large',view:true,tone:'on-deep',sizes:'(min-width: 768px) 320px, 70vw'})+`</div>`);
 return `<section${attrs({class:'page-profile page-profile__gallery',id:section.id,'aria-labelledby':`${section.id}-title`})}><div class="wrap">`
  +sectionHead({runningHead:section.runningHead,heading:section.heading,emphasis:section.emphasis,id:`${section.id}-title`,tone:'on-deep'})
  +`</div><div class="page-profile__wall"><span class="page-profile__ledge" aria-hidden="true"></span>`
  +stillShelf(frames,{label:section.shelfLabel,previous:section.previous,next:section.next})
  +`</div><div class="wrap"><p class="page-profile__hint" data-needs-script>${text(section.hint)}</p></div></section>`;
}

function reviews(ctx,words){
 const section=words.reviews;
 return `<section${attrs({class:'page-profile page-profile__reviews',id:section.id,'aria-labelledby':`${section.id}-title`})}><div class="wrap">`
  +sectionHead({runningHead:section.runningHead,heading:section.heading,emphasis:section.emphasis,id:`${section.id}-title`})
  +`</div>`+reviewShelf(ctx,{filter:words.id,limit:section.shown,featured:true,id:`reviews-${words.id}`})
  +`</section>`;
}

/** `id` is "sanjay" or "parul". */
export function profile(ctx,id){
 const words=profilePage(id);
 return cover(ctx,words)+care(words)+about(words)+certificates(words)+reviews(ctx,words)+closing(ctx,{doctor:id});
}
