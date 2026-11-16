// A still shelf: a row of cards the visitor moves with a swipe, the arrows or the keyboard.
// Nothing on it moves by itself. (Skeleton: plain markup.)
import {reviewShelf as words} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,text} from '../../lib/html.mjs';
import {roundButton} from '../button/button.mjs';

/**
 *   items  ready-made markup for each card, in order
 *   label  what the row holds, for assistive technology ("A walk through the clinic")
 *   previous / next  spoken names of the two arrows
 */
export function stillShelf(items,{label,previous=words.previous,next=words.next,className=''}={}){
 if(!label)throw new RangeError('A shelf needs a label');
 return `<div${attrs({class:classes('still-shelf',className),'data-still-shelf':true})}>`
  +`<ul class="still-shelf__row" tabindex="0" aria-label="${text(label)}" data-shelf>${items.map(item=>`<li class="still-shelf__item">${item}</li>`).join('')}</ul>`
  +`<div class="still-shelf__arrows" data-needs-script>${roundButton({icon:'left',label:previous,attributes:{'data-shelf-previous':true}})}${roundButton({icon:'right',label:next,attributes:{'data-shelf-next':true}})}</div></div>`;
}
