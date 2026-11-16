// Booking ON / OFF in the browser (contracts 2.3 and 2.4). The booking package decides the state
// and announces every change; this module makes the page follow it: the two main booking
// controls change their words and address but always stay visible, every other booking link
// disappears while OFF, and parts marked "only while OFF" appear.
import {syncBookingLink} from '../../clinic/booking-links.mjs';
import {bookingEntryFor,bookingPaths} from '../../clinic/page-content/shared.mjs';

/** The main booking controls: the header's, and a page's first-screen one. Value: "header" or "page". */
export const ENTRY_SELECTOR='[data-booking-entry]';

/** What one main booking control must carry in a booking state (pure). */
export function entryState(place,enabled,route=''){
 const words=bookingEntryFor(place,enabled);
 return Object.freeze({href:words.path,spoken:words.spoken,hint:words.hint,label:words.label,
  icon:enabled?'calendar':'phone',current:place==='header'&&enabled&&route===bookingPaths.book});
}

const setAttribute=(node,name,value)=>{
 if(value===null){if(node.hasAttribute(name))node.removeAttribute(name);}
 else if(node.getAttribute(name)!==value)node.setAttribute(name,value);
};
const setFlag=(node,name,value)=>{if(node[name]!==value)node[name]=value;};

/** Bring the main booking controls under `root` into a state. Returns them, so the link pass can skip them. */
export function syncEntries(root,enabled,route=''){
 const entries=new Set(root.querySelectorAll(ENTRY_SELECTOR));
 for(const node of entries){
  const wanted=entryState(node.getAttribute('data-booking-entry')==='header'?'header':'page',enabled,route);
  setAttribute(node,'href',wanted.href);setAttribute(node,'aria-label',wanted.spoken);setAttribute(node,'title',wanted.hint);
  setAttribute(node,'aria-current',wanted.current?'page':null);
  setAttribute(node,'data-booking-only',null);setFlag(node,'hidden',false);setFlag(node,'inert',false);
  const label=node.querySelector('[data-booking-on]');
  if(label){const text=enabled?label.getAttribute('data-booking-on'):label.getAttribute('data-booking-off');if(label.textContent!==text)label.textContent=text;}
  for(const icon of node.querySelectorAll('[data-home-entry-icon]'))setFlag(icon,'hidden',icon.getAttribute('data-home-entry-icon')!==wanted.icon);
 }
 return entries;
}

/** Bring everything under `root` into a booking state. Safe to call as often as needed. */
export function syncBookingState(root,{enabled,route=''}){
 const entries=syncEntries(root,enabled,route);
 for(const anchor of root.querySelectorAll('a[href],a[data-booking-href]'))if(!entries.has(anchor))syncBookingLink(anchor,enabled);
 for(const node of root.querySelectorAll('[data-booking-only]')){if(entries.has(node))continue;setFlag(node,'hidden',!enabled);setFlag(node,'inert',!enabled);}
 for(const node of root.querySelectorAll('[data-booking-off-only]')){setFlag(node,'hidden',enabled);setFlag(node,'inert',enabled);}
 return entries.size;
}

/**
 * Follow the booking state for the life of the page. `enabled()` reads the state now;
 * `subscribe(listener)` tells parts when it changes (not on every repaint).
 */
export function bindBookingState({state,displayAllowed,windowObject=window,documentObject=document,route=()=>''}){
 const listeners=new Set();
 const enabled=()=>displayAllowed(state.getSnapshot());
 let last=null;
 const sync=()=>{
  const now=enabled();
  syncBookingState(documentObject,{enabled:now,route:route()});
  if(last!==now){last=now;for(const listener of [...listeners])listener(now);}
 };
 // The package sends this after every change of state and after anything is drawn.
 windowObject.addEventListener('booking:visibility',sync);
 const unsubscribe=state.subscribe(sync);
 return Object.freeze({
  enabled,sync,
  subscribe(listener,{signal}={}){
   listeners.add(listener);const stop=()=>listeners.delete(listener);
   signal?.addEventListener('abort',stop,{once:true});return stop;
  },
  dispose(){windowObject.removeEventListener('booking:visibility',sync);unsubscribe();listeners.clear();}
 });
}
