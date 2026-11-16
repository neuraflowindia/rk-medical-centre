// Keeps the closing heading true: "See a doctor today." while the clinic is open or opens later
// today, otherwise "Book your next visit." (or "Arrange your next visit." while booking is off).
import {emphasise} from '../../lib/html.mjs';
import {closingTitle} from './closing.mjs';

/** Put the heading into a state. Writes only when the words change. */
export function paintClosing(node,signState,enabled){
 const title=closingTitle(signState,enabled);
 if(node.getAttribute('data-heading')===title.heading)return false;
 node.setAttribute('data-heading',title.heading);
 node.innerHTML=emphasise(title.heading,title.emphasis,{keep:title.keep});
 return true;
}

/** `sign()` gives the latest live-sign state; the open-sign behaviour calls `repaint` on its clock. */
export function bindClosing(root,{signal,services}={}){
 const node=root.querySelector('[data-closing] [data-closing-title]');
 if(!node)return null;
 let state='pending';
 const repaint=sign=>{if(sign)state=sign.state;paintClosing(node,state,services?.booking?services.booking.enabled():true);};
 services?.booking?.subscribe(()=>repaint(),{signal});
 return repaint;
}
