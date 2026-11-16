// Paints every live sign on the page from the clinic's times (India time) and repaints every
// half minute. A failure leaves the neutral line in place and never stops the page.
import {liveSign} from '../../../clinic/page-content/shared.mjs';

/** Put one sign into a state. Writes only what changed. */
export function paintOpenSign(node,sign){
 if(node.getAttribute('data-state')!==sign.state)node.setAttribute('data-state',sign.state);
 const label=node.querySelector('[data-open-label]'),detail=node.querySelector('[data-open-detail]');
 if(label&&label.textContent!==sign.label)label.textContent=sign.label;
 if(detail&&detail.textContent!==sign.detail)detail.textContent=sign.detail;
}

/**
 * Keep the signs under `root` live until `signal` aborts. `onPaint(sign)` lets another part
 * (the closing heading) follow the same clock.
 */
export function bindOpenSigns(root,{signal,now=()=>new Date(),every=30000,timers=globalThis,onPaint}={}){
 try{
  const nodes=[...root.querySelectorAll('[data-open-sign]')];
  if(!nodes.length&&!onPaint)return ()=>{};
  const update=()=>{
   try{const sign=liveSign(now());for(const node of nodes)paintOpenSign(node,sign);onPaint?.(sign);}
   catch{/* the sign stays as it was; the page carries on */}
  };
  update();
  const id=timers.setInterval(update,every);
  const stop=()=>timers.clearInterval(id);
  signal?.addEventListener('abort',stop,{once:true});
  return stop;
 }catch{return ()=>{};}
}
