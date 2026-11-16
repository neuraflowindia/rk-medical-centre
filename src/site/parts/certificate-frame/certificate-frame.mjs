// Certificates as framed documents: one site frame for all of them (thin mustard mat, hairline),
// with a museum-label caption: title, issuing body and year, whose it is. (Skeleton: plain markup.)
import {doctors} from '../../../clinic/model.mjs';
import {attrs,classes,image,oneOf,text} from '../../lib/html.mjs';

export const CERTIFICATE_SIZES=Object.freeze(['small','regular','large']);

/** `item` is a record of clinic/certificate-catalogue.mjs (or of homeCertificates()). */
export function certificateFrame(item,{size='regular',tilt=0,lag=0,sizes='(min-width: 768px) 280px, 62vw'}={}){
 oneOf(size,CERTIFICATE_SIZES,'certificate size');
 const widest=item.variants.at(-1),record={src:widest.src,width:widest.width,height:widest.height,sources:item.variants.map(variant=>({src:variant.src,width:variant.width}))};
 const owner=item.doctorName||doctors[item.doctor]?.name||'';
 return `<figure${attrs({class:classes('certificate-frame',`certificate-frame--${size}`),'data-certificate':item.id,style:`--tilt:${Number(tilt)}deg;--lag:${Number(lag)}`})}>`
  +`<div class="certificate-frame__mat">${image(record,{sizes,alt:item.description})}</div>`
  +`<figcaption class="certificate-frame__label"><strong>${text(item.title)}</strong><span>${text(item.issuer)}</span>${owner?`<span>${text(owner)}</span>`:''}</figcaption></figure>`;
}

/** A row (phones: a swipeable row) of framed certificates. `settle: true` lets them settle as the section scrolls in. */
export function certificateWall(items,{label='Certificates',settle=false,size='regular'}={}){
 const tilts=[-2.2,1.6,-1.4,2.4,-1.8,1.2];
 return `<ul${attrs({class:'certificate-wall','aria-label':label,'data-certificate-wall':true,'data-settle':settle})}>`
  +items.map((item,index)=>`<li>${certificateFrame(item,{size,tilt:settle?tilts[index%tilts.length]:0,lag:settle?index*.12:0})}</li>`).join('')+`</ul>`;
}
