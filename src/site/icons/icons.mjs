// One icon family: 24 × 24, 1.5 px line, round caps. The sprite is printed once per document by
// runtime/render.mjs, so icons show with the first paint; every use is a small <use> reference.
// Arrow rule: `arrow` stays inside the site, `out` leaves it, `phone` is a call.
import {attrs,e} from '../lib/html.mjs';

export const iconPaths=Object.freeze({
 arrow:'<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
 out:'<path d="M7 17 17 7M8.5 7H17v8.500"/>',
 phone:'<path d="M21 16.400v2.700a1.800 1.800 0 0 1-2 1.800 17.900 17.900 0 0 1-7.800-2.800 17.600 17.600 0 0 1-5.400-5.400A17.900 17.900 0 0 1 3 4.900 1.800 1.800 0 0 1 4.800 3h2.700a1.800 1.800 0 0 1 1.800 1.500c.1.900.3 1.700.6 2.500a1.800 1.800 0 0 1-.4 1.900L8.400 10a14.400 14.400 0 0 0 5.400 5.400l1.100-1.100a1.800 1.800 0 0 1 1.900-.4c.8.3 1.600.5 2.500.6A1.800 1.800 0 0 1 21 16.400Z"/>',
 pin:'<path d="M12 21s-7-6-7-11.300a7 7 0 0 1 14 0C19 15 12 21 12 21Z"/><circle cx="12" cy="9.700" r="2.500"/>',
 rupee:'<path d="M7 4.500h10M7 9h10M7 4.500h3.200a4.500 4.500 0 0 1 0 9H7l7.500 6.500"/>',
 banknote:'<rect x="3" y="6.500" width="18" height="11" rx="2.500"/><circle cx="12" cy="12" r="2.400"/><path d="M6.500 10v4M17.500 10v4"/>',
 clock:'<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
 calendar:'<rect x="4" y="5.500" width="16" height="14.500" rx="2"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/>',
 menu:'<path d="M4 8.500h16M4 15.500h16"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 left:'<path d="M14.500 6l-6 6 6 6"/>',
 right:'<path d="M9.500 6l6 6-6 6"/>',
 down:'<path d="M6 9.500l6 6 6-6"/>',
 plus:'<path d="M12 5.500v13M5.500 12h13"/>',
 minus:'<path d="M5.500 12h13"/>',
 check:'<path d="M5 12.500l4.500 4.500L19 7.500"/>',
 star:'<path d="M12 3.300l2.650 5.400 5.950.850-4.300 4.200 1 5.950L12 16.900l-5.300 2.800 1-5.950-4.300-4.200 5.950-.850Z"/>',
 medal:'<circle cx="12" cy="15" r="5"/><path d="M9.300 10.800 6.500 3.500h4l1.500 3.600M14.700 10.800l2.800-7.300h-4L12 7.100"/><path d="M12 13v4"/>',
 whatsapp:'<path d="M3.600 20.400l1.250-4.300a8.400 8.400 0 1 1 3.200 3.100Z"/><path d="M9.200 8.300c-.5.3-.8.8-.7 1.500.3 2.300 2.500 4.600 4.900 5 .7.1 1.300-.2 1.600-.7l.3-.6-1.800-1-.8.7c-.9-.4-1.700-1.200-2.100-2.100l.7-.8-1-1.800Z"/>',
 pause:'<path d="M9 6v12M15 6v12"/>',
 play:'<path d="M8 5.500v13l10-6.500Z"/>',
 route:'<path d="M12 3.500 19.500 20 12 16.300 4.500 20Z"/>',
 car:'<path d="M4 16.500v-4l1.800-4.300A2 2 0 0 1 7.650 7h8.700a2 2 0 0 1 1.850 1.200L20 12.500v4M4 12.500h16M6.500 16.500v1.500M17.500 16.500v1.500M4 16.500h16"/>',
 file:'<path d="M7 3.500h7l4 4V20a.5.5 0 0 1-.5.5h-10.500A.5.5 0 0 1 6.500 20V4a.5.5 0 0 1 .5-.5ZM14 3.500v4h4M9.500 12.500h5M9.500 16h5"/>',
 mail:'<rect x="3.500" y="5.500" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
 person:'<circle cx="12" cy="8" r="3.500"/><path d="M5 20a7 7 0 0 1 14 0"/>',
 info:'<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.700v.1"/>',
 alert:'<path d="M12 4 21 19.500H3Z"/><path d="M12 10v4.500M12 17v.1"/>',
 search:'<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4 4"/>',
 edit:'<path d="M4.500 19.500l1-4L16 5a2 2 0 0 1 3 3L8.500 18.500Z"/><path d="M14.500 6.500l3 3"/>',
 heart:'<path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.200a4.300 4.300 0 0 1 7.500 2.600C19.500 15.400 12 20 12 20Z"/>',
 stethoscope:'<path d="M6 4v5a4 4 0 0 0 8 0V4M6 4H4.500M14 4h1.500M10 13v2.500a4.500 4.500 0 0 0 9 0V13"/><circle cx="19" cy="10.800" r="2.200"/>',
 shield:'<path d="M12 3.500l7 2.500v5.500c0 4.300-2.900 7.400-7 9-4.100-1.600-7-4.700-7-9V6Z"/><path d="M9 12l2.200 2.200L15 10.300"/>'
});

export const iconNames=Object.freeze(Object.keys(iconPaths));

/** The id a sprite symbol carries, and a <use> points to. */
export const iconId=name=>`i-${name}`;

/**
 * One icon as a reference into the sprite. Decorative by default (hidden from assistive
 * technology); give `label` only when the icon stands alone without words beside it.
 */
export function icon(name,{className='',label=''}={}){
 if(!Object.hasOwn(iconPaths,name))throw new RangeError('Unknown icon: '+name);
 const naming=label?{role:'img','aria-label':label}:{'aria-hidden':'true'};
 return `<svg${attrs({class:className?`icon ${className}`:'icon',...naming,focusable:'false'})}><use href="#${iconId(name)}"/></svg>`;
}

/** Five stars for a rating; a half star is filled through the sprite's `half` gradient. */
export function stars(fills){
 return fills.map(fill=>`<svg${attrs({class:`icon${fill>=1?'':fill>0?' icon--half':' icon--empty'}`,'aria-hidden':'true',focusable:'false'})}><use href="#${iconId('star')}"/></svg>`).join('');
}

/** The sprite: every icon as a <symbol>, plus the half-star fill. Printed once per document. */
export function sprite(){
 const symbols=iconNames.map(name=>`<symbol id="${e(iconId(name))}" viewBox="0 0 24 24">${iconPaths[name]}</symbol>`).join('');
 return `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs><linearGradient id="i-half-fill"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="currentColor" stop-opacity="0"/></linearGradient>${symbols}</defs></svg>`;
}
