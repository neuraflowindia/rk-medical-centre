/** Preserve booking destinations without exposing operable links while OFF. */
const bookingPath=/^\/booking(?:-details|-help)?(?:[/?#]|$)/;
export function bookingDestination(value){return typeof value==='string'&&bookingPath.test(value);}
export function suppressBookingLinks(html){
 return html.replace(/<a\b[^>]*>/g,tag=>{
  const match=tag.match(/\shref=("([^"]*)"|'([^']*)')/);if(!match)return tag;
  const href=match[2]??match[3];if(!bookingDestination(href))return tag;
  let output=tag.replace(match[0],` data-booking-href=${match[1]}`);
  if(!/\shidden(?:\s|>|=)/.test(output))output=output.replace(/>$/,' hidden>');
  if(!/\sinert(?:\s|>|=)/.test(output))output=output.replace(/>$/,' inert>');
  return output;
 });
}
export function syncBookingLink(anchor,enabled){
 const href=anchor.getAttribute('data-booking-href')||anchor.getAttribute('href');
 if(!bookingDestination(href))return false;
 anchor.setAttribute('data-booking-href',href);anchor.setAttribute('data-booking-only','');
 if(enabled)anchor.setAttribute('href',href);else anchor.removeAttribute('href');
 anchor.hidden=!enabled;anchor.inert=!enabled;return true;
}
