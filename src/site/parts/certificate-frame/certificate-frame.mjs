// Certificates as framed documents: one site frame for all of them (a thin mustard mat and a
// hairline), with a museum-label caption: what it is, who issued it and when, whose it is.
import {doctors} from '../../../clinic/model.mjs';
import {plainCertificates} from '../../../clinic/client-media.mjs';
import {attrs,classes,image,oneOf,text} from '../../lib/html.mjs';
import {roundButton} from '../button/button.mjs';

export const CERTIFICATE_SIZES=Object.freeze(['small','regular','large']);
const TILTS=Object.freeze([-2.2,1.6,-1.4,2.4,-1.8,1.2]);

/** The picture of a certificate: the one with its physical frame cropped away where it exists. */
export function certificatePicture(item){
 const plain=plainCertificates[item.id];
 if(plain)return {...plain,alt:item.description};
 const widest=item.variants.at(-1);
 return {src:widest.src,width:widest.width,height:widest.height,alt:item.description,sources:item.variants.map(variant=>({src:variant.src,width:variant.width}))};
}
const ownerOf=item=>item.doctorName||doctors[item.doctor]?.name||'';
function label(item,className='certificate-frame__label'){
 const owner=ownerOf(item);
 return `<figcaption class="${className}"><strong>${text(item.title)}</strong><span>${text(item.issuer)}</span>${owner?`<span>${text(owner)}</span>`:''}</figcaption>`;
}

/**
 * `item` is a record of clinic/certificate-catalogue.mjs (or of homeCertificates()).
 *   size   'small' · 'regular' · 'large' — the picture's height (the frame keeps the picture's own shape)
 *   view   true makes the document a control that opens the viewer on it
 *   tone   'on-deep' for a frame on the deep ground (its label and focus ring change colour)
 *   tilt, lag  used by a wall that settles as it scrolls in (see certificateWall)
 */
export function certificateFrame(item,{size='regular',view=false,tone='',tilt=0,lag=0,sizes='(min-width: 768px) 320px, 62vw'}={}){
 oneOf(size,CERTIFICATE_SIZES,'certificate size');oneOf(tone,['','on-deep'],'certificate tone');
 const picture=image(certificatePicture(item),{sizes});
 const mat=view
  ?`<button class="certificate-frame__mat certificate-frame__mat--view" type="button" aria-haspopup="dialog" aria-label="${text(`View: ${item.title}`)}" data-view-certificate="${text(item.id)}">${picture}</button>`
  :`<div class="certificate-frame__mat">${picture}</div>`;
 return `<figure${attrs({class:classes('certificate-frame',`certificate-frame--${size}`,tone&&`certificate-frame--${tone}`),'data-certificate':item.id,style:`--tilt:${Number(tilt)}deg;--lag:${Number(lag)}`})}>${mat}${label(item)}</figure>`;
}

/**
 * A row of framed certificates (on phones a row the visitor moves).
 *   label   what the row holds, for assistive technology
 *   settle  true lets the documents settle into place as the row scrolls into view
 *   size, view, tone  passed to every frame
 */
export function certificateWall(items,{label:name='Certificates',settle=false,size='regular',view=false,tone=''}={}){
 return `<ul${attrs({class:'certificate-wall','aria-label':name,'data-certificate-wall':true,'data-settle':settle})}>`
  +items.map((item,index)=>`<li class="certificate-wall__item">${certificateFrame(item,{size,view,tone,tilt:settle?TILTS[index%TILTS.length]:0,lag:settle?Math.round(index*12)/100:0})}</li>`).join('')+`</ul>`;
}

/** The viewer's contents: one certificate large, with its caption, and the way to its neighbours. */
export function certificateViewer(items,index,{previous='Previous certificate',next='Next certificate'}={}){
 const item=items[index];
 if(!item)throw new RangeError('No such certificate');
 const many=items.length>1;
 return `<figure class="certificate-viewer__figure" data-viewer-certificate="${text(item.id)}">`
  +`<div class="certificate-viewer__mat">${image(certificatePicture(item),{sizes:'(min-width: 768px) 720px, 92vw',eager:true})}</div>`
  +label(item,'certificate-viewer__label')+`</figure>`
  +(many?`<div class="certificate-viewer__controls">${roundButton({icon:'left',label:previous,attributes:{'data-viewer-previous':true}})}`
   +`<p class="certificate-viewer__count" aria-live="polite">${index+1} of ${items.length}</p>`
   +`${roundButton({icon:'right',label:next,attributes:{'data-viewer-next':true}})}</div>`:'');
}
