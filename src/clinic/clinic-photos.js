import {clinicPhotos,clinicAlbum} from './client-media.mjs';
import {directions,escapeHTML as e} from './model.mjs';
import {link,arrow,solidIcon} from './ui.js';

const defaultSizes='(max-width:767px) calc(100vw - 40px),(max-width:1199px) calc(100vw - 64px),840px';
const gallerySizes='(max-width:767px) calc(100vw - 40px),(max-width:1023px) calc(100vw - 64px),(max-width:1375px) calc((100vw - 128px) * .666667),832px';
const arrivalSizes='(max-width:767px) calc(100vw - 40px),(max-width:1199px) calc((100vw - 88px) / 2),(max-width:1375px) calc((100vw - 144px) / 3),411px';

export function photoImage(id,{sizes=defaultSizes,loading='lazy',className=''}={}){
 const photo=clinicPhotos[id];
 if(!photo)return '';
 const candidates=photo.sources.map(source=>`${source.src} ${source.width}w`).join(',');
 return `<img class="clinic-client-image${className?' '+e(className):''}" data-client-photo-image="${e(id)}" src="${e(photo.src)}" srcset="${e(candidates)}" sizes="${e(sizes)}" width="${photo.width}" height="${photo.height}" alt="${e(photo.alt)}" loading="${loading==='eager'?'eager':'lazy'}" decoding="async">`;
}

function photoError(id,interactive){
 return `<span class="clinic-photo-error" data-photo-error hidden><span role="status">Photo unavailable</span>${interactive?'<span class="clinic-photo-retry-label">Retry photo</span>':`<button type="button" class="clinic-photo-retry" data-photo-retry="${e(id)}">Retry photo</button>`}</span>`;
}

export function photoFigure(id,{sizes=defaultSizes,className='',caption=true,open=true}={}){
 const photo=clinicPhotos[id];
 if(!photo)return '';
 const frame=`<span class="clinic-photo-frame" data-photo-frame>${photoImage(id,{sizes})}${photoError(id,open)}</span>`;
 const image=open?`<button type="button" class="clinic-photo-button" data-photo-open="${e(id)}" aria-label="View full photograph: ${e(photo.caption)}">${frame}</button>`:frame;
 return `<figure class="clinic-photo-figure${className?' '+e(className):''}">${image}${caption?`<figcaption><span>${e(photo.caption)}</span>${open?`<button type="button" class="clinic-photo-open-label" data-photo-open="${e(id)}" aria-label="View full photograph: ${e(photo.caption)}"><span>View photo</span>${arrow}</button>`:''}</figcaption>`:''}</figure>`;
}

export function homeClinicPreview(){
 return `<section id="home-clinic-preview" class="warm clinic-home-preview" data-client-photo-section aria-labelledby="home-clinic-photos-title"><div class="wrap clinic-home-photo-grid"><div class="clinic-home-photo-copy"><p class="eyebrow">${solidIcon('pin')}<span>R. K. Medical Centre</span></p><h2 id="home-clinic-photos-title">See the clinic before your visit</h2><p>Take a look at the waiting area and the rooms where you’ll meet the doctors.</p><div class="actions"><button type="button" class="button" data-photo-open="${e(clinicAlbum[0])}"><span>View all ${clinicAlbum.length} photos</span>${arrow}</button><a class="text-link clinic-about-photo-link" href="${link('/about-clinic')}"><span>About the clinic</span>${arrow}</a></div></div>${photoFigure('waiting-area',{className:'clinic-home-photo',sizes:'(max-width:767px) calc(100vw - 40px),(max-width:1199px) calc((100vw - 100px) * .6),560px'})}</div></section>`;
}

const shortLabels={'waiting-area':'Waiting area',reception:'Reception',entrance:'Entrance','sanjay-room':'General health room','parul-room':'Women’s health room','street-frontage':'Clinic frontage','clinic-gate':'Clinic gate'};

export function clinicGallery(){
 const first=clinicAlbum[0];
 return `<section class="white clinic-gallery-section" id="clinic-photos" data-client-photo-section aria-labelledby="clinic-gallery-title"><div class="wrap" data-clinic-gallery><header class="clinic-photos-heading"><p class="eyebrow">${solidIcon('pin')}<span>Inside the clinic</span></p><h2 id="clinic-gallery-title">Take a look around the clinic</h2><p>See the waiting area, the entrance and the consultation rooms before you visit.</p></header><div class="clinic-gallery-grid"><div data-gallery-stage>${photoFigure(first,{sizes:gallerySizes})}</div><div class="clinic-photo-choices" role="group" aria-label="Choose a clinic photograph">${clinicAlbum.map(id=>`<button type="button" class="clinic-photo-choice" data-photo-select="${e(id)}" aria-pressed="${id===first}" aria-label="Show ${e(clinicPhotos[id].caption)}"><span class="clinic-photo-choice-image" data-photo-frame>${photoImage(id,{sizes:'(max-width:1023px) 88px,96px'})}${photoError(id,true)}</span><span class="clinic-photo-choice-label">${e(shortLabels[id]||clinicPhotos[id].caption)}</span></button>`).join('')}</div></div><div class="clinic-gallery-bottom"><p>Choose a picture to see more. Open any photograph for the full view.</p><button type="button" class="button secondary" data-gallery-open data-photo-open="${e(first)}"><span>View all ${clinicAlbum.length} photos</span>${arrow}</button></div></div></section>`;
}

export function arrivalPhotos(){
 return `<section id="arrival-photos" class="white clinic-arrival-section" data-client-photo-section aria-labelledby="clinic-arrival-title"><div class="wrap"><header class="clinic-photos-heading"><h2 id="clinic-arrival-title">What to look for when you arrive</h2><p>See the clinic frontage, the entrance and the gate from the street.</p></header><div class="clinic-arrival-grid">${photoFigure('street-frontage',{sizes:arrivalSizes})}${photoFigure('entrance',{sizes:arrivalSizes})}${photoFigure('clinic-gate',{sizes:arrivalSizes})}</div><div class="clinic-arrival-directions"><p>The clinic is in Indira Nagar, Lucknow. Use Google Maps for directions to the clinic.</p><a class="button secondary" href="${e(directions)}" target="_blank" rel="noopener noreferrer"><span>Get directions</span>${arrow}</a></div></div></section>`;
}
