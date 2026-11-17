// A doctor's profile: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs). The one thing the page adds is the "next clinic session" line of the
// cover: it is printed neutral (the build cannot know the time of the visit), painted as soon as
// the page is bound and kept fresh while the page stays open. Everything stops when `signal`
// aborts; the file imports cleanly outside a browser.
import {nextSession} from '../../../clinic/page-content/doctors.mjs';

/** How often the line is worked out again. */
export const SESSION_REFRESH=30000;

/** Write one answer into one line. Only what changed is touched, so a screen reader is not interrupted. */
export function paintSession(node,session){
 if(node.getAttribute('data-state')!==session.state)node.setAttribute('data-state',session.state);
 const label=node.querySelector('[data-session-label]'),detail=node.querySelector('[data-session-detail]');
 if(label&&label.textContent!==session.label)label.textContent=session.label;
 if(detail&&detail.textContent!==session.detail)detail.textContent=session.detail;
}

/**
 * `now`, `every` and `timers` can be replaced in tests. A failure leaves the line as it was
 * printed (the week's sessions in words) and never stops the page.
 */
export function bindProfile(root,{signal,now=()=>new Date(),every=SESSION_REFRESH,timers=globalThis}={}){
 const lines=[...(root?.querySelectorAll?.('[data-next-session]')||[])];
 if(!lines.length||signal?.aborted)return;
 const update=()=>{
  try{const session=nextSession(now());for(const line of lines)paintSession(line,session);}
  catch{/* the line stays as it was; the page carries on */}
 };
 update();
 const timer=timers.setInterval(update,every);
 signal?.addEventListener('abort',()=>timers.clearInterval(timer),{once:true});
}
