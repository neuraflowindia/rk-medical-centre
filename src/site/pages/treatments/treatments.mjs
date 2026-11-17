// Treatments: a calm contents page. A plain title page, then the index (two groups headed by
// their doctor, nine rows, one open at a time), then the two doctors for anything not listed,
// then the shared closing.
//
// A row is a link to its own place (#diabetes), so without scripts the browser itself opens it;
// with scripts the behaviour keeps one row open, keeps the tapped row under the finger and
// brings the panel's buttons into view. On laptops the open row's panel stands beside the index.
import {treatmentsPage as words,arrivalFor} from '../../../clinic/page-content/treatments.mjs';
import {clinicObjects} from '../../../clinic/client-media.mjs';
import {attrs,classes,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {sectionHead} from '../../parts/section-head/section-head.mjs';
import {bookButton,callButton} from '../../parts/button/button.mjs';
import {doctorAvatar} from '../../parts/action-bar/action-bar.mjs';
import {doctorMiniCard} from '../../parts/doctor-mini-card/doctor-mini-card.mjs';
import {closing} from '../../parts/closing/closing.mjs';

/** The ids one row's markup uses, so the template, the behaviour and the tests agree. */
export const topicIds=id=>Object.freeze({item:id,title:`topic-title-${id}`,panel:`topic-panel-${id}`});

function object(name,className){
 if(!Object.hasOwn(clinicObjects,name))throw new RangeError('Unknown object: '+name);
 return image(clinicObjects[name],{className});
}

/** The first-screen action: one raised row that opens the call sheet (or, without scripts, leads to the footer's numbers). */
function guideRow(){
 return `<a class="page-treatments__guide" href="#footer-calls" aria-haspopup="dialog" data-open-call data-bar-lead>`
  +`<span class="page-treatments__guide-tile" aria-hidden="true">${icon('phone')}</span>`
  +`<span class="page-treatments__guide-words"><strong>${text(words.guide.lead)}</strong> <span>${text(words.guide.rest)}</span></span>`
  +`</a>`;
}

/**
 * The open row's panel: the large object over its arch, three labelled lines, and the doctor strip.
 * Its first element is a marker that is on screen only while the row is open: on phones the motion
 * module runs it as the index's one slow mover, and the open row's object floats while it runs.
 */
function panel(row,group,ctx){
 const ids=topicIds(row.id);
 const facts=[[words.labels.what,`<dd>${text(row.what)}</dd>`],[words.labels.when,`<dd>${text(row.when)}</dd>`],
  [words.labels.bring,`<dd><ul class="page-treatments__bring">${row.bring.map(item=>`<li>${icon('check')}<span>${text(item)}</span></li>`).join('')}</ul></dd>`]];
 return `<div class="page-treatments__panel-place"><div${attrs({class:'page-treatments__panel',id:ids.panel,role:'region','aria-labelledby':ids.title,'data-topic-panel':true})}>`
  +`<span class="page-treatments__alive" aria-hidden="true" data-ambient></span>`
  +`<div class="page-treatments__stage" aria-hidden="true"><span class="page-treatments__arch" data-ambient><span class="page-treatments__shaft"></span></span><span class="page-treatments__stage-float" data-ambient="float">${object(row.object,'page-treatments__stage-object')}</span></div>`
  // The row beside or above the panel already names it for everyone; this larger name is for the eye only.
  +`<p class="page-treatments__panel-title" aria-hidden="true">${text(row.title)}</p>`
  +`<dl class="page-treatments__facts">${facts.map(([label,value])=>`<div><dt>${text(label)}</dt>${value}</div>`).join('')}</dl>`
  +`<div class="page-treatments__strip">${doctorAvatar(row.doctor,'page-treatments__strip-face')}`
  +`<p class="page-treatments__strip-who"><strong>${text(group.name)}</strong><span>${text(words.fee)}</span></p>`
  +`<div class="page-treatments__strip-actions">${bookButton(ctx,{doctor:row.doctor,topic:row.topic})}${callButton(ctx,{doctor:row.doctor,lead:true})}</div></div>`
  +`</div></div>`;
}

function topic(row,group,ctx,open){
 const ids=topicIds(row.id);
 return `<li${attrs({class:'page-treatments__topic',id:ids.item,'data-topic':row.id,'data-open':open})}>`
  +`<a${attrs({class:'page-treatments__row',href:row.href,'aria-controls':ids.panel,'data-topic-row':true})}>`
  // The rows keep an even rhythm, so a row does not move on entrance: its object settles onto its plate instead.
  +`<span${attrs({class:'page-treatments__object','data-object':row.object,'data-enter':true})}>${object(row.object,'page-treatments__object-art')}</span>`
  +`<span class="page-treatments__row-words"><h3${attrs({class:'page-treatments__row-title',id:ids.title})}>${text(row.title)}</h3><span class="page-treatments__row-deck">${text(row.deck)}</span></span>`
  +`<span class="page-treatments__row-mark" aria-hidden="true">${icon('down')}</span></a>`
  +panel(row,group,ctx)+`</li>`;
}

function groupOf(group,ctx,openRow){
 const head=`group-${group.id}`;
 return `<section${attrs({class:classes('page-treatments__group',`page-treatments__group--${group.tone}`),id:group.id,'aria-labelledby':head,'data-topic-group':group.id})}>`
  +`<header class="page-treatments__byline" data-enter>${doctorAvatar(group.doctor,'page-treatments__byline-face')}`
  +`<h2${attrs({class:'page-treatments__byline-words',id:head})}><span class="page-treatments__byline-name">${text(group.name)}</span> <span class="page-treatments__byline-role">${text(group.role)}</span></h2></header>`
  +`<ul class="page-treatments__rows">${group.rows.map(row=>topic(row,group,ctx,row.id===openRow)).join('')}</ul></section>`;
}

export function treatments(ctx){
 // An address that names a row (the older ?topic= and ?service= links) is drawn with it open.
 const openRow=arrivalFor({search:ctx.search}).row;
 return `<div class="page-treatments page-treatments__contents">`
  +`<section class="page-treatments__head" aria-labelledby="treatments-title"><div class="wrap"><div class="page-treatments__head-copy">`
  +sectionHead({runningHead:words.runningHead,heading:words.heading,emphasis:words.emphasis,level:1,id:'treatments-title',enter:false})
  +guideRow()+`</div></div></section>`
  +`<section${attrs({class:'page-treatments__index','aria-label':words.indexLabel,'data-topics':true})}><div class="wrap"><div class="page-treatments__groups">`
  +words.groups.map(group=>groupOf(group,ctx,openRow)).join('')
  +`</div></div></section>`
  // The two doctors sit inside the same block as the index: on laptops the open row's panel travels on beside them.
  +`<section class="page-treatments__doctors" aria-labelledby="treatments-doctors-title">`
  +`<div class="page-treatments__doctors-head">${sectionHead({heading:words.doctors.heading,emphasis:words.doctors.emphasis,id:'treatments-doctors-title'})}</div>`
  +`<div class="page-treatments__doctors-cards">${words.groups.map(group=>
   `<div${attrs({class:classes('page-treatments__doctor-slot',`page-treatments__doctor-slot--${group.tone}`),'data-enter':'card'})}>${doctorMiniCard(group.doctor,ctx,{actions:false})}</div>`).join('')}</div>`
  +`</section></div>`
  +closing(ctx);
}
