// The essentials strip: three answers on one line — are you open, what does it cost, where are you.
// The first cell is live (the open sign); the third opens Google Maps.
import {essentials} from '../../../clinic/page-content/shared.mjs';
import {text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {openSign} from '../open-sign/open-sign.mjs';

export function essentialsStrip(ctx){
 const {fee,place}=essentials;
 return `<ul class="essentials-strip" aria-label="${text(essentials.label)}" data-essentials-strip>`
  +`<li class="essentials-strip__cell essentials-strip__cell--open">${openSign(ctx,{form:'strip',tag:'div'})}</li>`
  +`<li class="essentials-strip__cell"><span class="essentials-strip__icon">${icon(fee.icon)}</span>`
  +`<span class="essentials-strip__text"><span class="essentials-strip__label"><span class="wide-only">${text(fee.labelWide)}</span><span class="narrow-only">${text(fee.label)}</span></span><span class="essentials-strip__value">${text(fee.value)}</span></span></li>`
  +`<li class="essentials-strip__cell essentials-strip__cell--place"><a class="essentials-strip__link" href="${text(place.href)}" target="_blank" rel="noopener">`
  +`<span class="essentials-strip__icon">${icon(place.icon)}</span>`
  +`<span class="essentials-strip__text"><span class="essentials-strip__label">${text(place.labelShort)}<span class="wide-only">${text(place.label.slice(place.labelShort.length))}</span></span>`
  +`<span class="essentials-strip__value">${text(place.action)} ${icon('out',{className:'essentials-strip__out'})}<span class="visually-hidden"> ${text(place.opens)}</span></span></span>`
  +`<span class="essentials-strip__go" aria-hidden="true">${icon('out')}</span>`
  +`</a></li></ul>`;
}
