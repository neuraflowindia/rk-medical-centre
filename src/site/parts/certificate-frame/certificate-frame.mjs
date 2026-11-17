// Certificates as framed documents: one site frame for all of them (a thin mustard mat and a
// hairline), with a museum-label caption: what it is, who issued it and when, whose it is.
import {doctors} from '../../../clinic/model.mjs';
import {plainCertificates} from '../../../clinic/client-media.mjs';
import {issuerLine} from '../../../clinic/page-content/shared.mjs';
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
/** The largest file of a certificate's picture: where a viewing frame leads when scripts are off. */
export function certificateFile(item){
 const record=certificatePicture(item);
 return record.sources?.at(-1)?.src||record.src;
}
/** How tall a certificate's picture is for its width (1.41 for an upright page, 0.66 for a wide one). */
export function certificateShape(item){
 const record=certificatePicture(item);
 return Math.round(record.height/record.width*1000)/1000;
}
const ownerOf=item=>item.doctorName||doctors[item.doctor]?.name||'';
function label(item,className='certificate-frame__label'){
 const owner=ownerOf(item);
 return `<figcaption class="${className}"><strong>${text(item.title)}</strong><span>${text(issuerLine(item.issuer))}</span>${owner?`<span>${text(owner)}</span>`:''}</figcaption>`;
}

/**
 * `item` is a record of clinic/certificate-catalogue.mjs (or of homeCertificates()).
 *   size   'small' · 'regular' · 'large' — the picture's height (the frame keeps the picture's own shape)
 *   view   true makes the document a control that opens the viewer on it. It is printed as a link
 *          to the certificate's own picture, so it is never a dead control without scripts; the
 *          behaviour turns it into the button that opens the viewer
 *   set    which documents the viewer then walks through: '' = the ones on the same wall (or page),
 *          'all' = every certificate of the catalogue, standing at this one
 *   tone   'on-deep' for a frame on the deep ground (its label and focus ring change colour)
 *   tilt, lag  used by a wall that settles as it scrolls in (see certificateWall)
 */
export function certificateFrame(item,{size='regular',view=false,set='',tone='',tilt=0,lag=0,sizes='(min-width: 768px) 320px, 62vw'}={}){
 oneOf(size,CERTIFICATE_SIZES,'certificate size');oneOf(tone,['','on-deep'],'certificate tone');oneOf(set,['','all'],'certificate set');
 const record=certificatePicture(item),picture=image(record,{sizes});
 // the picture's shape (width over height), so a page can size the frame before the picture has loaded
 const shape=Math.round(record.width/record.height*1000)/1000;
 const mat=view
  ?`<a${attrs({class:'certificate-frame__mat certificate-frame__mat--view',href:certificateFile(item),'aria-label':`View: ${item.title}`,'data-view-certificate':item.id,'data-view-set':set||null})}>${picture}</a>`
  :`<div class="certificate-frame__mat">${picture}</div>`;
 return `<figure${attrs({class:classes('certificate-frame',`certificate-frame--${size}`,tone&&`certificate-frame--${tone}`),'data-certificate':item.id,style:`--tilt:${Number(tilt)}deg;--lag:${Number(lag)};--ar:${shape}`})}>${mat}${label(item)}</figure>`;
}

/**
 * A row of framed certificates (on phones a row the visitor moves).
 *   label   what the row holds, for assistive technology
 *   settle  true lets the documents settle into place as the row scrolls into view
 *   size, view, set, tone  passed to every frame
 */
export function certificateWall(items,{label:name='Certificates',settle=false,size='regular',view=false,set='',tone=''}={}){
 return `<ul${attrs({class:'certificate-wall','aria-label':name,'data-certificate-wall':true,'data-settle':settle})}>`
  // A settling wall's documents also carry the ordinary entrance, one a little after the other: it is
  // what a browser without scroll-linked animation shows (the stylesheet stills it where the settle runs).
  +items.map((item,index)=>`<li${attrs({class:'certificate-wall__item','data-enter':settle?'card':null,'data-enter-after':settle&&index?String(Math.round(index*12)/100):null})}>${certificateFrame(item,{size,view,set,tone,tilt:settle?TILTS[index%TILTS.length]:0,lag:settle?Math.round(index*12)/100:0})}</li>`).join('')+`</ul>`;
}

/**
 * The viewer's contents: one certificate large, with its caption, and the way to its neighbours.
 * The picture stands on a stage as tall as the set's tallest document needs (`--tallest`), so the
 * dialog keeps one height and its arrows stay under the finger from one document to the next.
 */
export function certificateViewer(items,index,{previous='Previous certificate',next='Next certificate'}={}){
 const item=items[index];
 if(!item)throw new RangeError('No such certificate');
 const many=items.length>1,tallest=Math.max(...items.map(certificateShape));
 return `<figure class="certificate-viewer__figure" data-viewer-certificate="${text(item.id)}" style="--tallest:${tallest}">`
  +`<div class="certificate-viewer__stage"><div class="certificate-viewer__mat">${image(certificatePicture(item),{sizes:'(min-width: 768px) 720px, 92vw',eager:true})}</div></div>`
  +label(item,'certificate-viewer__label')+`</figure>`
  +(many?`<div class="certificate-viewer__controls">${roundButton({icon:'left',label:previous,attributes:{'data-viewer-previous':true}})}`
   +`<p class="certificate-viewer__count" aria-live="polite">${index+1} of ${items.length}</p>`
   +`${roundButton({icon:'right',label:next,attributes:{'data-viewer-next':true}})}</div>`:'');
}
