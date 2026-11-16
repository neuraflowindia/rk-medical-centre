// The header: a quiet, solid lockup that is always there.
// Laptop: lockup, page links, the live sign in words, "Book an appointment".
// Phone: two-line lockup and the menu button; it slides away on the way down and returns on the way up.
import {clinicName,clinicPlace,mainNavigation,navigationCurrent,navigationLabels,pagePaths} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,oneOf,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {bookingEntry,callButton} from '../button/button.mjs';
import {openSign} from '../open-sign/open-sign.mjs';

export const LOGO=Object.freeze({src:'/clinic-assets/rk-medical-centre-logo.webp',width:165,height:192});

/** The clinic's mark and name. Shared by the header, the menu sheet and the footer. */
export function lockup({className='',deep=false,nameId=''}={}){
 const mark=`<img src="${LOGO.src}" width="${LOGO.width}" height="${LOGO.height}" alt="" decoding="async">`;
 return `<a${attrs({class:classes('lockup',deep&&'lockup--deep',className),href:pagePaths.home,'aria-label':navigationLabels.home})}>`
  +(deep?`<span class="lockup__tile">${mark}</span>`:mark)
  +`<span class="lockup__text"><span${attrs({class:'lockup__name',id:nameId||null})}>${text(clinicName)}</span><span class="lockup__place">${text(clinicPlace)}</span></span></a>`;
}

/** The page links of the laptop header; the current page is marked. */
export function mainLinks(ctx){
 return mainNavigation.map(item=>`<a${attrs({class:'site-header__link',href:item.path,'aria-current':navigationCurrent(item.path,ctx.path)?'page':null})}>${text(item.label)}</a>`).join('');
}

/**
 *   chrome  'full'  lockup, links, live sign, main booking control, menu button
 *           'slim'  lockup and "Need help? Call" only (the booking screens)
 */
export function siteHeader(ctx,{chrome='full'}={}){
 oneOf(chrome,['full','slim'],'header chrome');
 if(chrome==='slim'){
  return `<header class="site-header site-header--slim" data-site-header><div class="wrap site-header__row">${lockup()}`
   +callButton(ctx,{label:navigationLabels.help,size:'compact',className:'site-header__help'})+`</div></header>`;
 }
 return `<header class="site-header" data-site-header><div class="wrap site-header__row">${lockup()}`
  +`<nav class="site-header__nav" aria-label="${text(navigationLabels.main)}">${mainLinks(ctx)}</nav>`
  +openSign(ctx,{form:'line',className:'site-header__sign'})
  +bookingEntry(ctx,{place:'header',size:'compact',className:'site-header__book',hook:'data-header-appointment'})
  // Without scripts the menu button is a plain link to the footer, where every page is listed.
  +`<a class="site-header__menu" href="#site-footer" role="button" aria-haspopup="dialog" aria-controls="menu" aria-expanded="false" aria-label="${text(navigationLabels.openMenu)}" data-open-menu>${icon('menu')}<span>${text(navigationLabels.menuButton)}</span></a>`
  +`</div></header>`;
}
