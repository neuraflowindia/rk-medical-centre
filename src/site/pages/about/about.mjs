// About the clinic: the place and its standards. Five sections, each its own composition, on
// alternating grounds so every boundary shows.
//   1 cover (a feature opener: heading, one sentence, the frontage photograph)   light
//   2 story (the long read: a display year, one column, one pulled line)        tint
//   3 standards (a quiet ledger)                                                deep
//   4 walk (three numbered photograph cards on a shelf the visitor moves)       light
//   5 the doctors (two mini-cards and a short certificates teaser)               tint
//   then the shared closing.
// The page has no first-screen buttons of its own on phones, so the phone bar is there from the start.
import {clinicObjects,clinicPhotos} from '../../../clinic/client-media.mjs';
import {cover,story,standards,walk,doctorsSection,stepSpoken,viewPhotoLabel,walkPosition,walkViewerTitle} from '../../../clinic/page-content/about.mjs';
import {attrs,emphasise,image,text} from '../../lib/html.mjs';
import {callButton,roundButton,textLink} from '../../parts/button/button.mjs';
import {sectionHead,runningHead} from '../../parts/section-head/section-head.mjs';
import {photoFigure} from '../../parts/photo-figure/photo-figure.mjs';
import {stillShelf} from '../../parts/still-shelf/still-shelf.mjs';
import {doctorMiniCard} from '../../parts/doctor-mini-card/doctor-mini-card.mjs';
import {certificateFrame} from '../../parts/certificate-frame/certificate-frame.mjs';
import {closing} from '../../parts/closing/closing.mjs';

// The frontage is never shown wider than 640 px, a walk photograph never wider than 300 px.
const COVER_SIZES='(min-width: 768px) 640px, 92vw';
const STEP_SIZES='(min-width: 1024px) 300px, (min-width: 768px) 284px, 250px';
const VIEWER_SIZES='(min-width: 768px) 480px, 82vw';
const DOCUMENT_SIZES='220px';
/** How much later each following part of a group starts to arrive, as a share of its own travel. */
const AFTER=.14;
const after=index=>index?{'data-enter-after':(index*AFTER).toFixed(2)}:{};

function coverSection(ctx){
 const shot=cover.photo,way=cover.directions;
 return `<section class="page-about page-about__cover" id="cover" aria-labelledby="about-title"><div class="wrap page-about__cover-grid">`
  +`<div class="page-about__cover-copy">`
  +sectionHead({runningHead:cover.runningHead,heading:cover.heading,emphasis:cover.emphasis,intro:cover.lead,level:1,id:'about-title'})
  +`<div class="page-about__cover-actions">${callButton(ctx,{label:cover.call})}${textLink({label:way.label,href:way.href,external:true,note:way.opens})}</div></div>`
  +`<div class="page-about__stage"><div class="page-about__disc" aria-hidden="true" data-ambient><span class="page-about__shaft"></span></div>`
  +photoFigure(shot.photo,{ratio:shot.ratio,caption:shot.caption,captionKey:shot.key,sizes:COVER_SIZES,loading:'eager',className:'page-about__frontage'})
  +image(clinicObjects[cover.object],{className:'page-about__pin'})
  +`</div></div></section>`;
}

function storySection(){
 return `<section class="page-about page-about__story" id="story" aria-labelledby="story-title"><div class="wrap page-about__story-grid">`
  +`<div class="page-about__story-head">${runningHead(story.runningHead)}`
  +`<h2 class="page-about__year" id="story-title" data-enter><span class="page-about__numeral">${text(story.numeral)}</span> `
  +`<span class="page-about__year-words">${emphasise(story.heading,story.emphasis)}</span></h2></div>`
  +`<div class="page-about__story-column"><p class="page-about__story-opening" data-enter>${text(story.opening)}</p>`
  +`<p${attrs({'data-enter':true,...after(1)})}>${text(story.body)}</p>`
  // A sentence of the story, set large in its place: its two hairlines draw in; the words stay put.
  +`<p class="page-about__pulled" data-enter="rule">${text(story.pulled)}</p>`
  +`<p data-enter>${text(story.handover)}</p></div></div></section>`;
}

function standardsSection(){
 const rows=standards.rows.map((row,index)=>`<div${attrs({class:'page-about__standard','data-standard':row.id,'data-enter':'rule',...after(index)})}>`
  +`<dt><span class="page-about__standard-name">${text(row.name)}</span> <span class="page-about__standard-kind">${text(row.kind)}</span></dt>`
  +`<dd>${text(row.meaning)}</dd></div>`).join('');
 const [sheet,pen]=standards.objects;
 return `<section class="page-about page-about__standards" id="standards" aria-labelledby="standards-title"><div class="wrap page-about__standards-grid">`
  +`<div class="page-about__standards-head">`
  +sectionHead({runningHead:standards.runningHead,heading:standards.heading,id:'standards-title',tone:'on-deep'})
  // Wide screens only: a pale niche (far), a lined sheet standing in it and a pen laid across it (near).
  +`<div class="page-about__still" aria-hidden="true" data-enter="card"><span class="page-about__still-niche"></span>`
  +image(clinicObjects[sheet],{className:'page-about__still-sheet'})+image(clinicObjects[pen],{className:'page-about__still-pen'})
  +`</div></div><dl class="page-about__ledger">${rows}</dl></div></section>`;
}

/** One step of the walk: its photograph (with the button that opens it large), its number, title and line. */
function stepCard(step,index){
 const number=index+1;
 return `<article class="page-about__step" data-step="${text(step.id)}">`
  +`<div class="page-about__step-photo" data-step-photo>${photoFigure(step.photo,{ratio:walk.ratio,sizes:STEP_SIZES})}`
  +roundButton({icon:'search',label:viewPhotoLabel(step.title),className:'page-about__step-view',attributes:{'aria-haspopup':'dialog','data-view-step':index,'data-needs-script':true}})
  +`</div>`
  // The numeral is the path's marker; assistive technology hears "Step 2:" in the title instead.
  +`<p${attrs({class:'page-about__step-number','aria-hidden':'true','data-enter':'rule',...after(index)})}><span>${number}</span></p>`
  +`<h3 class="page-about__step-title"><span class="visually-hidden">${text(stepSpoken(number))}</span>${text(step.title)}</h3>`
  +`<p class="page-about__step-line">${text(step.line)}</p></article>`;
}

function walkSection(){
 return `<section class="page-about page-about__walk" id="walk" aria-labelledby="walk-title"><div class="wrap">`
  +sectionHead({runningHead:walk.runningHead,heading:walk.heading,emphasis:walk.emphasis,id:'walk-title'})+`</div>`
  +stillShelf(walk.steps.map(stepCard),{label:walk.label,previous:walk.previous,next:walk.next,className:'page-about__shelf'})
  +`</section>`;
}

/**
 * One certificate of the teaser: a framed document that opens every certificate in the viewer,
 * standing at itself. Without scripts the frame leads to the certificate's own picture.
 */
function teaserDocument(item){
 return certificateFrame(item,{view:true,set:'all',sizes:DOCUMENT_SIZES});
}

function doctorsPart(ctx){
 const more=doctorsSection.certificates;
 return `<section class="page-about page-about__doctors" id="doctors" aria-labelledby="doctors-title"><div class="wrap page-about__doctors-grid">`
  +sectionHead({runningHead:doctorsSection.runningHead,heading:doctorsSection.heading,id:'doctors-title'})
  +`<div class="page-about__credits"><ul class="page-about__cards">`
  // The cards say who; the closing directly below says act, so they carry no buttons here.
  +doctorsSection.cards.map((id,index)=>`<li${attrs({'data-enter':'card',...after(index)})}>${doctorMiniCard(id,ctx,{actions:false})}</li>`).join('')
  +`</ul>`
  // The teaser: one framed document under each doctor, overlapping the card's lower edge, then the way to all of them.
  +`<ul class="page-about__documents" aria-label="${text(more.shownLabel)}" data-about-documents>`
  +more.shown.map((item,index)=>`<li${attrs({'data-enter':'card',...after(index)})}>${teaserDocument(item)}</li>`).join('')
  +`</ul><p class="page-about__certificates" data-enter="rule"><span class="page-about__certificates-label">${text(more.label)}</span>`
  // With scripts the link opens every certificate in the shared viewer; without, it leads to Meet the doctors.
  +textLink({label:more.link,href:more.href,attributes:{'data-open-certificates':''}})+`</p></div></div></section>`;
}

/**
 * One step of the walk as the shared viewer shows it: the photograph large, the step's words, and
 * the way to its neighbours. Pure, so the viewer can draw it and a test can read it.
 */
export function walkSlide(index){
 const step=walk.steps[index];
 if(!step)throw new RangeError('The walk has no step '+index);
 const number=index+1;
 return `<figure class="page-about__viewer" data-viewer-step="${index}">`
  +`<div class="page-about__viewer-frame">${image(clinicPhotos[step.photo],{sizes:VIEWER_SIZES,eager:true})}</div>`
  +`<figcaption class="page-about__viewer-words"><strong>${text(walkViewerTitle(number,step.title))}</strong><span>${text(step.line)}</span></figcaption></figure>`
  // The two arrows carry the shared viewer's own hooks: it gives them their state and their job.
  +`<div class="page-about__viewer-controls">${roundButton({icon:'left',label:walk.previousPhoto,attributes:{'data-viewer-previous':true}})}`
  +`<p class="page-about__viewer-count" aria-live="polite">${text(walkPosition(number,walk.steps.length))}</p>`
  +`${roundButton({icon:'right',label:walk.nextPhoto,attributes:{'data-viewer-next':true}})}</div>`;
}

export function about(ctx){
 return coverSection(ctx)+storySection()+standardsSection()+walkSection()+doctorsPart(ctx)+closing(ctx);
}
