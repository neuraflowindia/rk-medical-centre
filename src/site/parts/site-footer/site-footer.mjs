// The footer: deep ground, complete and compact. The clinic, both doctors with their numbers and
// registration lines, every page, "How your details are used", and the "Pause motion" control.
import {doctors} from '../../../clinic/model.mjs';
import {bookingPaths,bookingEntry as entryWords,copyrightLine,footer,weekHours} from '../../../clinic/page-content/shared.mjs';
import {attrs,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {lockup} from '../site-header/site-header.mjs';

export function siteFooter(ctx){
 const hours=weekHours.map(row=>`<span>${text(`${row.short} ${row.hours}`)}</span>`).join(' ');
 const people=footer.registrations.map(row=>{
  const doctor=doctors[row.id];
  return `<li class="site-footer__doctor"><strong class="site-footer__name">${text(row.name)}</strong>`
   +`<a class="site-footer__phone" href="tel:${doctor.tel}" aria-label="${text(`Call ${row.name} at ${doctor.phone}`)}">${icon('phone')}<span class="site-footer__digits">${text(doctor.phone)}</span></a>`
   +`<span class="site-footer__registration">${text(row.line)}</span></li>`;
 }).join('');
 const pages=footer.pages.map(page=>`<li><a${attrs({class:'site-footer__link',href:page.path,'aria-current':ctx.path===page.path?'page':null})}>${text(page.label)}</a></li>`).join('');
 return `<footer class="site-footer" id="site-footer" data-site-footer>`
  +`<div class="wrap site-footer__grid">`
  +`<div class="site-footer__brand">${lockup({deep:true})}<address class="site-footer__address">${text(footer.address)}</address>`
  +`<p class="site-footer__hours"><span class="visually-hidden">${text(footer.hoursLabel)}: </span>${hours}</p></div>`
  +`<ul class="site-footer__doctors" id="footer-calls" aria-label="${text(footer.phonesLabel)}">${people}</ul>`
  +`<nav class="site-footer__nav" aria-label="${text(footer.pagesLabel)}"><ul>${pages}`
  +`<li><a class="site-footer__link" href="${bookingPaths.book}">${text(entryWords.header.on.label)}</a></li>`
  +`<li data-needs-script><button class="site-footer__link" type="button" aria-haspopup="dialog" data-collection-notice>${text(footer.detailsNotice)}</button></li>`
  +`<li data-needs-script><button class="site-footer__link" type="button" aria-haspopup="dialog" data-privacy>${text(footer.privacyChoices)}</button></li>`
  +`</ul></nav></div>`
  +`<div class="wrap site-footer__base"><p>${text(copyrightLine(ctx.now.getFullYear()))}</p>`
  +`<button class="site-footer__motion" type="button" aria-pressed="false" data-motion-toggle data-needs-script>${icon('pause')}<span data-motion-label>${text(footer.motion.pause)}</span></button>`
  +`</div></footer>`;
}
