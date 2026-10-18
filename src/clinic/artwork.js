import {preparationMarks} from './preparation-art.mjs';
import {layerGeometry} from './layer-geometry.mjs';
import {compositions} from './composition-data.mjs';
const svg=(body,cls='')=>`<svg class="care-symbol ${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const symbols={
 A02:'<path d="M18 9v16a12 12 0 0 0 24 0V9M18 9h6m12 0h6M30 37v7a10 10 0 0 0 20 0v-8"/><circle cx="50" cy="31" r="5"/>',
 A03:'<rect x="17" y="7" width="30" height="46" rx="9"/><rect x="23" y="14" width="18" height="18" rx="3"/><circle cx="32" cy="42" r="3"/><path d="M29 53v7h6v-7"/>',
 A04:'<circle cx="23" cy="18" r="8"/><circle cx="44" cy="23" r="7"/><path d="M8 53v-9a15 15 0 0 1 30 0v9m0-17a12 12 0 0 1 18 10v7"/>',
 A05:'<circle cx="32" cy="18" r="8"/><path d="M17 50v-7a15 15 0 0 1 30 0v7M9 17C2 45 17 59 32 59S62 45 55 17"/>',
 A13:'<circle data-layer="contour" pathLength="1" cx="32" cy="32" r="27"/><g data-layer="main"><path d="M20 17v10a8 8 0 0 0 16 0V17m-8 18v6a7 7 0 0 0 14 0v-5"/><circle cx="42" cy="32" r="4"/></g>',
 A14:'<path data-layer="contour" pathLength="1" d="M8 25C8 7 56 7 56 25v8c0 17-24 26-24 26S8 50 8 33Z"/><path data-layer="main" d="M19 29c0-13 26-13 26 0v5c0 10-13 17-13 17s-13-7-13-17Z"/>'
};
export function symbol(id){return `<span data-composition="${id}">${svg(symbols[id]||symbols.A04)}</span>`;}
export function utilityIcon(type){const shapes={reports:'<path d="M18 8h24l8 8v40H14V8Zm24 0v12h8M23 30h18M23 39h18M23 48h12"/>',medicine:'<path d="m19 23 12-12a11 11 0 0 1 16 16L27 47a11 11 0 0 1-16-16l8-8Zm0 0 16 16"/>',questions:'<path d="M12 10h40v34H29L16 55V44h-4Z M26 22c1-8 15-8 15 0 0 6-9 6-9 12"/><circle cx="32" cy="39" r="1"/>'};return svg(shapes[type]||shapes.questions);}
export function layerImage(id,name,eager=false){const stem=id.toLowerCase()+'-'+name;const meta=layerGeometry[stem];const img=`<img ${eager?'loading="eager"':'loading="lazy"'} decoding="async" src="/clinic-assets/${stem}-640.webp" srcset="/clinic-assets/${stem}-320.webp 320w,/clinic-assets/${stem}-640.webp 640w,/clinic-assets/${stem}-960.webp 960w" sizes="(max-width:767px) 230px,420px" width="1024" height="1024" alt="">`;return meta?`<svg class="layer-media" viewBox="${meta.box.join(' ')}" preserveAspectRatio="xMidYMid meet"><foreignObject x="0" y="0" width="${meta.width}" height="${meta.height}">${img}</foreignObject>${preparationMarks(id,name)}</svg>`:img;}
export function composition(id,sceneId=id.toLowerCase(),{eager=false}={}){
 const c=compositions[id];if(!c)throw new Error('Unknown composition '+id);
 return `<div class="art-scene composition composition-${id.toLowerCase()}" data-composition="${id}" data-scene="${c.motion}" data-scene-id="${sceneId}" aria-hidden="true"><div class="art-shadow" data-layer="shadow"></div>${c.layers.map((l,i)=>`<div class="art-position" style="left:${l.x}%;top:${l.y}%;width:${l.w}%;height:${l.h}%;z-index:${l.z??i+1}"><div class="art-entry" data-part="${l.name}" data-layer="${['main','second','front'][i]}"><div class="art-pointer"><div class="art-drift">${layerImage(id,l.name,eager)}</div></div></div></div>`).join('')}</div>`;
}
