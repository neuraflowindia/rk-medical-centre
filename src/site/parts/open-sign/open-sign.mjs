// The live sign: "Open now · until 1:30 pm". The page is printed with a neutral line (the build
// cannot know the time of the visit); the behaviour paints the real state and keeps it fresh.
// The dot is never the only cue: the words always say the state.
import {liveSignNeutral} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,oneOf,text} from '../../lib/html.mjs';

export const OPEN_SIGN_FORMS=Object.freeze(['line','strip','closing']);

/**
 *   form  'line'    one line with a dot (laptop header)
 *         'strip'   two stacked lines beside a dot (the essentials strip's live cell)
 *         'closing' one larger line (the closing section)
 */
export function openSign(ctx,{form='line',tag='p',className=''}={}){
 oneOf(form,OPEN_SIGN_FORMS,'open sign form');
 const sign=liveSignNeutral;
 return `<${tag}${attrs({class:classes('open-sign',`open-sign--${form}`,className),'data-open-sign':form,'data-state':sign.state,'data-nosnippet':true,
  // The soft ring around the open dot is a small mover: the strip's and the closing's, never the header's.
  'data-ambient':form==='line'?null:'minor'})}>`
  +`<span class="open-sign__dot" aria-hidden="true"></span>`
  +`<span class="open-sign__words"><span class="open-sign__label" data-open-label>${text(sign.label)}</span><span class="open-sign__sep" aria-hidden="true"> · </span><span class="open-sign__detail" data-open-detail>${text(sign.detail)}</span></span>`
  +`</${tag}>`;
}
