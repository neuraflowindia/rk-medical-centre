// The live sign: "Open now · until 1:30 pm". The page is printed with a neutral line (the build
// cannot know the time of the visit); the behaviour paints the real state and keeps it fresh.
// The dot is never the only cue: the words always say the state.
import {liveSignNeutral,liveSignNeutralShort} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,oneOf,text} from '../../lib/html.mjs';

export const OPEN_SIGN_FORMS=Object.freeze(['line','strip','closing']);

/**
 *   form  'line'    one line with a dot (laptop header, the foot of the call sheet)
 *         'strip'   two stacked lines beside a dot (the essentials strip's live cell); it also
 *                   carries the compact words a narrow cell shows instead ("Closed · opens / Mon 10:00 am")
 *         'closing' one larger line (the closing section)
 *   still true keeps the dot from pulsing (a sign that must not add a mover to its view)
 */
export function openSign(ctx,{form='line',tag='p',still=form==='line',className=''}={}){
 oneOf(form,OPEN_SIGN_FORMS,'open sign form');
 const strip=form==='strip',sign=strip?liveSignNeutralShort():liveSignNeutral;
 const words=(kind,value)=>strip
  ?`<span class="open-sign__full" data-open-${kind}>${text(value)}</span><span class="open-sign__compact" data-open-${kind}-compact>${text(value)}</span>`
  :`<span data-open-${kind}>${text(value)}</span>`;
 return `<${tag}${attrs({class:classes('open-sign',`open-sign--${form}`,className),'data-open-sign':form,'data-state':sign.state,'data-nosnippet':true,
  // The soft ring around the open dot is a small mover; the motion module decides when it may run.
  'data-ambient':still?null:'minor'})}>`
  +`<span class="open-sign__dot" aria-hidden="true"></span>`
  +`<span class="open-sign__words"><span class="open-sign__label">${words('label',sign.label)}</span><span class="open-sign__sep" aria-hidden="true"> · </span><span class="open-sign__detail">${words('detail',sign.detail)}</span></span>`
  +`</${tag}>`;
}
