// Behaviour that is fetched when its page is first shown, not with every page.
//
// One page carries far more script than the others: Contact, whose message form brings the
// booking engine's enquiry code with it. That behaviour is listed in the registry through
// `behaviourLater`, so the browser fetches it only on Contact. Until it arrives the page stands as
// it was printed (the form says "Opening the message form…"); if it cannot be fetched, the page
// says so itself and offers to try again: a visitor is never left waiting on a form that will not open.
import {messageForm} from '../../clinic/page-content/contact.mjs';

/**
 * A bind function for the registry whose module is fetched on first use.
 *   load()        returns the promise of the behaviour's module (a dynamic import)
 *   pick(module)  gives that module's bind function
 *   onFail(root, context)  says on the page that the behaviour could not be fetched
 * The returned function never throws, and binds nothing once the page has been left
 * (`context.signal`). It returns a promise that settles when the attempt is over (for tests).
 */
export function behaviourLater(load,pick,onFail=()=>{}){
 return function bindLater(root,context={}){
  const left=()=>!!context.signal?.aborted;
  return Promise.resolve().then(load)
   .then(module=>{if(!left())pick(module)(root,context);})
   .catch(()=>{if(!left())onFail(root,context);});
 };
}

const setHidden=(node,hidden)=>{if(node&&node.hidden!==hidden)node.hidden=hidden;};
/**
 * Put the printed message form into "could not open" (or back into "opening"), using only the
 * form's own hooks (build plan, contract 2.5). The form's engine paints the same state when the
 * clinic's service does not answer; this is for the case where the engine itself could not be fetched.
 */
export function paintFormOpening(root,failed){
 const shell=root?.querySelector?.('[data-message-form]');
 if(!shell)return null;
 const find=key=>shell.querySelector(`[data-contact-${key}]`);
 shell.setAttribute('data-state',failed?'failed':'opening');
 const status=find('status'),words=failed?messageForm.status.failed:messageForm.status.opening;
 if(status&&status.textContent!==words)status.textContent=words;
 setHidden(shell.querySelector('[data-message-steps]'),failed);
 setHidden(find('fields'),failed);setHidden(find('compose'),failed);
 setHidden(shell.querySelector('[data-contact-panel="failed"]'),!failed);
 setHidden(find('instead'),!failed);
 const again=find('retry');
 if(again){setHidden(again,!failed);if(failed&&again.disabled)again.disabled=false;}
 return again;
}
/**
 * The message form's engine could not be fetched: say so, keep Call and WhatsApp in reach, and
 * offer to try again. Trying again loads the page afresh: a browser does not fetch a failed
 * script a second time within one page, and nothing has been typed yet that could be lost.
 */
export function formCouldNotOpen(root,{signal}={},reload=()=>globalThis.location?.reload()){
 const again=paintFormOpening(root,true);
 again?.addEventListener('click',()=>{paintFormOpening(root,false);reload();},{once:true,signal});
}
