// A photograph in the site's one frame, with its caption below (never over the picture).
// Every caption carries a fact: who, where, or what to look for.
import {clinicPhotos} from '../../../clinic/client-media.mjs';
import {attrs,classes,image,oneOf,text} from '../../lib/html.mjs';

export const PHOTO_RATIOS=Object.freeze(['16:9','4:5','3:2','1:1']);
export const PHOTO_FRAMES=Object.freeze(['plain','arch']);

/**
 *   photoId  a record in clinic/client-media.mjs
 *   ratio    '16:9' · '4:5' · '3:2' · '1:1' — the frame's shape (the picture covers it)
 *   frame    'plain' (rounded, thin paper mat) · 'arch' (portraits: arch top)
 *   caption  the words under the picture; `captionKey` is a short caps label before them ("Above")
 *   sizes    the picture's width on screen, for the browser's choice of file
 *   loading  'lazy' (default) or 'eager' for a picture in the first screen
 *   enter    false leaves the entrance motion off
 */
export function photoFigure(photoId,{ratio='16:9',frame='plain',caption='',captionKey='',sizes='100vw',loading='lazy',alt,enter=true,className=''}={}){
 if(!Object.hasOwn(clinicPhotos,photoId))throw new RangeError('Unknown photograph: '+photoId);
 oneOf(ratio,PHOTO_RATIOS,'photo ratio');oneOf(frame,PHOTO_FRAMES,'photo frame');oneOf(loading,['lazy','eager'],'photo loading');
 const record=clinicPhotos[photoId];
 const words=caption?`<figcaption class="photo-figure__caption">${captionKey?`<span class="photo-figure__key">${text(captionKey)}</span>`:''}${text(caption)}</figcaption>`:'';
 return `<figure${attrs({class:classes('photo-figure',`photo-figure--${frame}`,`photo-figure--${ratio.replace(':','x')}`,className),...(enter&&loading!=='eager'?{'data-enter':'photo'}:{})})}>`
  +`<div class="photo-figure__frame">${image(record,{sizes,alt,eager:loading==='eager'})}</div>${words}</figure>`;
}
