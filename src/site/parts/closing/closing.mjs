// The closing: one decision. A heading that stays true at any hour and in either booking state,
// the live sign, the main booking button, and a raised row per doctor with the number in digits.
import {clinicObjects} from '../../../clinic/client-media.mjs';
import {bookingEntry as entryWords,callRows,closing as words,closingHeading,liveSignNeutral} from '../../../clinic/page-content/shared.mjs';
import {attrs,bookingOn,emphasise,image} from '../../lib/html.mjs';
import {bookButton} from '../button/button.mjs';
import {openSign} from '../open-sign/open-sign.mjs';
import {callRow,doctorAvatar} from '../action-bar/action-bar.mjs';

/** The closing heading's words and its italic phrase for a sign state and a booking state. */
export function closingTitle(signState,enabled){
 const heading=closingHeading(signState,enabled),emphasis=heading===words.headings.today?words.emphasis.today:words.emphasis.next;
 // the words before the italic phrase stay on one line ("Book your", never "Book" alone)
 return {heading,emphasis,keep:heading.endsWith(emphasis)?heading.slice(0,-emphasis.length).trim():''};
}

/**
 *   doctor  'sanjay' or 'parul': the closing of that doctor's profile (their button, their number);
 *           without it, the general closing with both doctors
 */
export function closing(ctx,{doctor=''}={}){
 const enabled=bookingOn(ctx),title=closingTitle(liveSignNeutral.state,enabled);
 const rows=callRows().filter(row=>!doctor||row.id===doctor);
 if(doctor&&!rows.length)throw new RangeError('Unknown doctor: '+doctor);
 const row=item=>`<li data-enter="card">${callRow(item,{avatar:doctorAvatar(item.id)})}</li>`;
 return `<section class="closing" id="closing" aria-labelledby="closing-title" data-closing${doctor?` data-closing-doctor="${doctor}"`:''}>`
  +`<div class="wrap"><div class="closing__panel"><span class="closing__arch" aria-hidden="true"></span>`
  +`<div class="closing__copy"><h2 class="closing__title" id="closing-title" data-enter><span data-closing-title>${emphasise(title.heading,title.emphasis,{keep:title.keep})}</span></h2>`
  +openSign(ctx,{form:'closing',className:'closing__sign'})
  +`<p class="closing__action">${bookButton(ctx,{doctor,size:'large',label:doctor?'':entryWords.page.on.label})}</p></div>`
  +`<ul${attrs({class:'call-rows closing__calls','aria-label':words.callsLabel})}>${rows.map(row).join('')}</ul>`
  +image(clinicObjects['telephone-handset'],{className:'closing__object'})
  +`</div></div></section>`;
}
