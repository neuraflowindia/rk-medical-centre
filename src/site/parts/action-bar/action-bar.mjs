// The phone action bar (Call · Book · Directions) and the contents of the call sheet.
// The bar is solid, sits under the thumb, and is shown only when the page's own main buttons
// are out of view (see the behaviour for the rules).
import {actionBar as words,bookingPaths,callRows,callSheet as sheetWords,essentials} from '../../../clinic/page-content/shared.mjs';
import {doctorAvatars} from '../../../clinic/client-media.mjs';
import {attrs,image,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {openSign} from '../open-sign/open-sign.mjs';

export function actionBar(ctx){
 return `<nav class="action-bar" aria-label="${text(words.label)}" data-action-bar>`
  +`<a class="action-bar__item action-bar__item--call" href="#footer-calls" role="button" aria-haspopup="dialog" data-open-call>${icon('phone')}<span>${text(words.call)}</span></a>`
  +`<a class="action-bar__book" href="${bookingPaths.book}">${text(words.book)}</a>`
  +`<a class="action-bar__item" href="${text(essentials.place.href)}" target="_blank" rel="noopener">${icon('route')}<span>${text(words.directions)}</span><span class="visually-hidden"> ${text(essentials.place.opens)}</span></a>`
  +`</nav>`;
}

/** A doctor's small square face for a row that names them. Decorative: the name is beside it. */
export function doctorAvatar(id,className='call-row__avatar'){
 if(!Object.hasOwn(doctorAvatars,id))throw new RangeError('Unknown doctor: '+id);
 return image(doctorAvatars[id],{className});
}

/** One raised row that dials a doctor: need, name, digits. Used by the call sheet and the closing. */
export function callRow(row,{avatar='',needFirst=false,attributes={}}={}){
 const who=needFirst
  ?`<span class="call-row__need">${text(row.need)}</span><strong class="call-row__name">${text(row.name)}</strong>`
  :`<strong class="call-row__name">${text(row.name)}</strong><span class="call-row__need">${text(row.need)}</span>`;
 return `<a${attrs({class:'call-row',href:row.href,'aria-label':row.spoken,'data-call-row':row.id,...attributes})}>${avatar}`
  +`<span class="call-row__who">${who}</span>`
  +`<span class="call-row__digits">${icon('phone')}${text(row.digits)}</span></a>`;
}

/** Contents of the call sheet (phone) and call panel (laptop): both doctors by need, then WhatsApp. */
export function callSheet(ctx){
 const rows=callRows().map(row=>`<li>${callRow(row,{needFirst:true,avatar:doctorAvatar(row.id)})}</li>`).join('');
 const whatsapp=sheetWords.whatsapp;
 return `<ul class="call-rows">${rows}`
  +`<li><a class="call-row call-row--whatsapp" href="${text(whatsapp.href)}" target="_blank" rel="noopener">`
  +`<span class="call-row__icon" aria-hidden="true">${icon('whatsapp')}</span>`
  +`<span class="call-row__who"><span class="call-row__need">${text(sheetWords.whatsappNeed)}</span><strong class="call-row__name">${text(whatsapp.label)}</strong></span>`
  +`<span class="call-row__digits">${icon('out')}<span class="visually-hidden">${text(sheetWords.opensWhatsapp)}</span></span></a></li></ul>`
  // Whether a call will be answered now: the same live line as the header's.
  +openSign(ctx,{form:'line',className:'call-rows__sign'});
}
