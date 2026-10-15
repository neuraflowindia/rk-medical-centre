import {doctors,address,escapeHTML as e} from './model.mjs';
import {reviews} from './content.mjs';
export const base='';
export const arrow='<span aria-hidden="true">↗</span>';
// One filled icon family, shared by readable content and its motion slots.
export const solidIconPaths={
person:'<circle cx="12" cy="6" r="4"/><path d="M3 22v-3a9 9 0 0 1 18 0v3Z"/>',
family:'<circle cx="8" cy="6" r="3.8"/><circle cx="18" cy="9" r="3"/><path d="M1 22v-5a7 7 0 0 1 14 0v5Zm15 0v-5a8 8 0 0 0-1-4 6 6 0 0 1 9 5v4Z"/>',
doctor:'<path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M4 3v7a5 5 0 0 0 10 0V3M4 3h2m6 0h2M9 15v2a5 5 0 0 0 10 0v-3"/><circle cx="19" cy="11" r="3.5"/>',
meter:'<path fill-rule="evenodd" d="M7 1h10a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4h-2v2H9v-2H7a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4Zm0 4v7h10V5Zm5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
calendar:'<path fill-rule="evenodd" d="M5 2h2v3h10V2h2v3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2Zm0 10v3h4v-3Zm7 0v3h4v-3Zm-7 5v3h4v-3Z"/>',
book:'<path d="M2 3c4-1 7 0 9 2v17c-3-2-6-3-9-2Zm20 0c-4-1-7 0-9 2v17c3-2 6-3 9-2Z"/>',
phone:'<path d="m6 1 5 5-3 4q2 4 6 6l4-3 5 5-3 5C10 22 2 14 1 4Z"/>',
pin:'<path fill-rule="evenodd" d="M12 24S3 15 3 9a9 9 0 0 1 18 0c0 6-9 15-9 15Zm0-19a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/>',
report:'<path fill-rule="evenodd" d="M4 1h11l5 5v17H4Zm10 2v5h5ZM7 11v2h10v-2Zm0 5v2h10v-2Z"/>',
medicine:'<path fill-rule="evenodd" d="M3 11 11 3a7 7 0 0 1 10 10l-8 8A7 7 0 0 1 3 11Zm3-1 8 8 5-5a5 5 0 0 0-7-7Z"/>',
check:'<path d="m2 12 3-3 5 5L21 3l3 3-14 16Z"/>',
question:'<path d="M2 2h20v16H10l-6 6v-6H2Z"/>',
heart:'<path d="M12 22 3 13C-5 5 5-4 12 4c7-8 17 1 9 9Z"/>',
credential:'<path fill-rule="evenodd" d="M2 2h20v15H2Zm4 4v2h12V6Zm0 4v2h6v-2Z"/><circle cx="16" cy="15" r="4"/><path d="m13 18-1 6 4-2 4 2-1-6Z"/>',
arrow:'<path d="M4 10h11l-4-4 3-3 9 9-9 9-3-3 4-4H4Z"/>',
quote:'<path d="M2 13c0-6 3-9 8-10v4c-3 1-4 3-4 5h4v9H2Zm12 0c0-6 3-9 8-10v4c-3 1-4 3-4 5h4v9h-8Z"/>'
};
export const solidIcon=(name,className='solid-icon')=>`<svg class="${e(className)}" viewBox="0 0 24 24" aria-hidden="true">${solidIconPaths[name]||solidIconPaths.book}</svg>`;
const nav=[['/','Home'],['/treatment','Treatments'],['/about-clinic','About the clinic'],['/meet-doctor','Doctors'],['/contact','Contact']];
let route='/';export function setRoute(r){route=r;}
export const link=path=>base+path;
export function art(stem,alt='',hero=false){const fresh=['glucose-meter-studio','thermometer-studio','report-folder-studio','adult-care-paper-relief'].includes(stem);const square=hero||fresh&&stem!=='adult-care-paper-relief';const root=fresh?'/clinic-assets/':'/clinic-assets/';return `<img ${hero?'fetchpriority="high"':'loading="lazy"'} decoding="async" src="${root}${stem}-800.webp" srcset="${root}${stem}-480.webp 480w,${root}${stem}-800.webp 800w,${root}${stem}-1200.webp 1200w" sizes="(max-width:599px) 220px,(max-width:1099px) 45vw,420px" width="${square?(fresh?1254:1024):1536}" height="${square&&fresh?1254:1024}" alt="${e(alt)}">`;}
export function action(label,path,secondary=false){return `<a class="button ${secondary?'secondary':''}" href="${link(path)}"><span class="button-label">${label}${arrow}</span></a>`;}
export function intro(title,text,kicker='R. K. Medical Centre'){return `<header class="section-heading"><p class="eyebrow">${kicker}</p><h1>${title}</h1>${text?`<p class="lead">${text}</p>`:''}</header>`;}
export function navLinks(){return nav.map(([path,title])=>`<a data-label="${title}" href="${link(path)}" ${route===path||(path==='/meet-doctor'&&route.startsWith('/dr-'))?'aria-current="page"':''}><span>${title}</span></a>`).join('');}
export function header(){return `<header class="site-header"><div class="wrap header-row"><a class="brand" href="${link('/')}" aria-label="R. K. Medical Centre home"><img src="/clinic-assets/rk-medical-centre-logo.webp" width="48" height="48" alt=""><span>R. K. Medical Centre<small>Lucknow</small></span></a><nav class="desktop-nav" aria-label="Main navigation">${navLinks()}</nav><a class="button book" ${route==='/booking'?'aria-current="page"':''} href="${link('/booking')}"><span class="book-long">Book an appointment</span><span class="book-short">Book</span>${arrow}</a><button class="menu-button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded="false">☰</button></div></header>`;}
export function footer(){return `<footer class="site-footer"><div class="wrap footer-grid"><div><a class="brand" href="${link('/')}"><img src="/clinic-assets/rk-medical-centre-logo.webp" width="44" height="44" alt=""><span>R. K. Medical Centre<small>Lucknow</small></span></a><p>Physician, diabetes and general health.<br>Women's health, pregnancy and ultrasound.</p></div><nav aria-label="Footer navigation">${navLinks()}<a href="${link('/booking')}" ${route==='/booking'?'aria-current="page"':''}>Book an appointment</a></nav><div><p class="footer-label">Phone and address</p><p>${e(address)}</p><a href="tel:${doctors.parul.tel}">${doctors.parul.phone}</a><br><a href="tel:${doctors.sanjay.tel}">${doctors.sanjay.phone}</a></div></div><div class="wrap preference-links"><button class="text-link" data-privacy>Change privacy choices</button></div></footer>`;}
export function feedback(group){const r=reviews[group][0];return `<div class="feedback-panel" data-review-group="${group}"><div class="quote-mark" aria-hidden="true">“</div><div><blockquote><p data-quote>${e(r.text)}</p><footer data-author>${e(r.name)}</footer></blockquote><div class="review-controls"><button class="text-link" data-read-review>Read full review ${arrow}</button><div class="pager"><button class="round" data-review-prev aria-label="Previous review">←</button><span data-review-count aria-live="polite">1 / ${reviews[group].length}</span><button class="round" data-review-next aria-label="Next review">→</button></div></div></div></div>`;}
export function next(){return `<section class="blue" id="next"><div class="wrap closing"><div><h2>Have a question before booking?</h2><p>Find the clinic's contact details and directions.</p></div><div class="actions">${action('Contact the clinic','/contact')}<a class="text-link" href="${link('/booking')}">Book an appointment ${arrow}</a></div></div></section>`;}
