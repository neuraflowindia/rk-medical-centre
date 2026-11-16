// Address → page, and what a click on a link should do. Pure decisions only: no document, no
// window, no history. The browser glue that acts on these decisions is in start.mjs.
import {normalizedPath} from '../../../appointment-system/hosting/surface-policy.mjs';
import {bookingDestination} from '../../clinic/booking-links.mjs';

/** Older addresses that open another screen. */
export const addressAliases=Object.freeze({'/booking-help':'/booking-details'});

/** "/About-Clinic/" → "/about-clinic"; an unsafe or undecodable address → null. */
export function tidyPath(pathname){
 try{return normalizedPath(decodeURIComponent(pathname));}catch{return null;}
}

/**
 * Which page an address shows. An unknown address shows Home (as the site always has), and
 * `rewrite` is true when the address bar should be corrected to `path`.
 */
export function resolveAddress(pathname,known){
 const tidy=tidyPath(pathname);
 const path=tidy&&Object.hasOwn(addressAliases,tidy)?addressAliases[tidy]:tidy;
 if(!path||!known.includes(path))return Object.freeze({path:'/',found:false,rewrite:false});
 return Object.freeze({path,found:true,rewrite:path!==pathname});
}

/** Is this address one of the booking screens (which must be admitted before they open)? */
export function isBookingAddress(path){return bookingDestination(path);}

/**
 * What a click on a link should do:
 *   'leave'   the browser handles it (another site, a new tab, a download, a modified click, tel: …)
 *   'place'   scroll to a place on this page and move focus there (`hash`)
 *   'booking' a booking screen: check that booking is admitted first (`path`)
 *   'page'    show another page of the site without a new page request (`path`, optional `hash`)
 * `click` is the event's own fields; `link` is {href (absolute), raw (the attribute), target, download};
 * `here` is {origin, pathname}.
 */
export function linkAction(click,link,here,known){
 const leave=Object.freeze({kind:'leave'});
 if(!link||click.defaultPrevented||click.button!==0||click.ctrlKey||click.metaKey||click.shiftKey||click.altKey)return leave;
 if(link.target&&link.target!=='_self')return leave;
 if(link.download)return leave;
 let url;
 try{url=new URL(link.href,here.origin+here.pathname);}catch{return leave;}
 if(url.origin!==here.origin)return leave;
 const raw=String(link.raw??'');
 if(raw.startsWith('#'))return raw.length>1?Object.freeze({kind:'place',hash:url.hash}):leave;
 const tidy=tidyPath(url.pathname);
 if(!tidy)return leave;
 const target=Object.hasOwn(addressAliases,tidy)?addressAliases[tidy]:tidy;
 if(!known.includes(target))return leave;
 if(isBookingAddress(target))return Object.freeze({kind:'booking',path:target+url.search});
 const current=resolveAddress(here.pathname,known).path;
 if(target===current&&url.hash&&!url.search)return Object.freeze({kind:'place',hash:url.hash,push:true});
 return Object.freeze({kind:'page',path:target+url.search,hash:url.hash});
}

/** Remembers how far each visited page was scrolled, by history entry. */
export function createScrollMemory(){
 const positions=new Map();let counter=0;
 return Object.freeze({
  next:()=>++counter,
  save:(key,y)=>{if(key!==undefined&&key!==null)positions.set(key,y);},
  read:key=>positions.get(key)??0
 });
}
