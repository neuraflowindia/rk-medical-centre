// A section's heading: a small-caps running head with a hairline, then the heading itself.
// An intro sentence is allowed only when it states a fact.
import {attrs,classes,emphasise,text} from '../../lib/html.mjs';

/**
 *   runningHead  short caps label above the heading ("The doctors"); optional
 *   heading      the words; `emphasis` is the one phrase inside them set in italics
 *   level        1 for a page's own heading (exactly one per page), 2 for sections, 3 inside a section
 *   intro        one sentence under the heading; optional
 *   id           the heading's id (for aria-labelledby and #places)
 *   enter        false leaves the entrance motion off (use for anything in a first screen)
 */
/** The caps running head by itself, for a section whose heading is not plain words. */
export function runningHead(label,{enter=true,className=''}={}){
 return `<p${attrs({class:classes('section-head__running',className),...(enter?{'data-enter':'rule'}:{})})}><span>${text(label)}</span></p>`;
}

/**
 *   tone  'on-deep' for a section on the deep ground
 */
export function sectionHead({runningHead:label='',heading,emphasis='',level=2,intro='',id='',enter=true,tone='',className=''}){
 if(![1,2,3].includes(level))throw new RangeError('A section heading is level 1, 2 or 3');
 if(!heading)throw new RangeError('A section needs a heading');
 const move=enter&&level!==1,order=()=>move?{'data-enter':true}:{};
 const running=label?`<p${attrs({class:'section-head__running',...(move?{'data-enter':'rule'}:{})})}><span>${text(label)}</span></p>`:'';
 const title=`<h${level}${attrs({class:'section-head__title',id:id||null,...order(1)})}>${emphasise(heading,emphasis)}</h${level}>`;
 const lead=intro?`<p${attrs({class:'section-head__intro',...order(2)})}>${text(intro)}</p>`:'';
 return `<header${attrs({class:classes('section-head',level===1&&'section-head--page',tone==='on-deep'&&'section-head--on-deep',className)})}>${running}${title}${lead}</header>`;
}
