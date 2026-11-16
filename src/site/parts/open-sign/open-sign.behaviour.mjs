// Paints every live sign on the page from the clinic's times (India time) and repaints every
// half minute. A failure leaves the neutral line in place and never stops the page.
import {liveSign} from '../../../clinic/page-content/shared.mjs';

/** Put one sign into a state. Writes only what changed. A sign with compact words gets those too. */
export function paintOpenSign(node,sign){
 if(node.getAttribute('data-state')!==sign.state)node.setAttribute('data-state',sign.state);
 const compact=sign.compact||sign;
 for(const [selector,words] of [['[data-open-label]',sign.label],['[data-open-detail]',sign.detail],
  ['[data-open-label-compact]',compact.label],['[data-open-detail-compact]',compact.detail]]){
  const target=node.querySelector(selector);
  if(target&&target.textContent!==words)target.textContent=words;
 }
}

/**
 * Keep the signs under `root` live until `signal` aborts. `onPaint(sign)` lets another part
 * (the closing heading) follow the same clock.
 */
export function bindOpenSigns(root,{signal,now=()=>new Date(),every=30000,timers=globalThis,onPaint}={}){
 try{
  // Signs are looked up at every tick: a sheet's sign is drawn after the page is bound.
  const update=()=>{
   try{const sign=liveSign(now());for(const node of root.querySelectorAll('[data-open-sign]'))paintOpenSign(node,sign);onPaint?.(sign);}
   catch{/* the sign stays as it was; the page carries on */}
  };
  update();
  const id=timers.setInterval(update,every);
  const stop=()=>timers.clearInterval(id);
  signal?.addEventListener('abort',stop,{once:true});
  return stop;
 }catch{return ()=>{};}
}
